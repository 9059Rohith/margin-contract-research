'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import { mapPdfPageItems, type PdfTextItem } from '@/lib/pdf-citation';
import type { Page } from '@/types/app';

type Props = {
  docId: string;
  size: number;
  pages: Page[];
  highlight: { start: number; end: number } | null;
  onUnavailable: (message: string) => void;
};

type PdfModule = typeof import('pdfjs-dist');

function PdfPage({ pdf, pdfjs, page, highlight, onUnavailable }: {
  pdf: PDFDocumentProxy;
  pdfjs: PdfModule;
  page: Page;
  highlight: Props['highlight'];
  onUnavailable: Props['onUnavailable'];
}) {
  const outer = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const marks = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = outer.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(Math.floor(element.clientWidth)));
    observer.observe(element);
    setWidth(Math.floor(element.clientWidth));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!width || !canvas.current || !layer.current || !marks.current || !outer.current) return;
    let cancelled = false;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | null = null;
    let textLayer: InstanceType<PdfModule['TextLayer']> | null = null;
    const canvasElement = canvas.current;
    const layerElement = layer.current;
    const marksElement = marks.current;
    const outerElement = outer.current;
    const render = async () => {
      const pdfPage = await pdf.getPage(page.page_no);
      if (cancelled) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const scale = width / base.width;
      const viewport = pdfPage.getViewport({ scale });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvasElement.width = Math.round(viewport.width * pixelRatio);
      canvasElement.height = Math.round(viewport.height * pixelRatio);
      canvasElement.style.width = `${viewport.width}px`;
      canvasElement.style.height = `${viewport.height}px`;
      outerElement.style.setProperty('--scale-factor', String(scale));
      setHeight(viewport.height);
      const context = canvasElement.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable.');
      renderTask = pdfPage.render({ canvasContext: context, viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
      await renderTask.promise;
      if (cancelled) return;
      const content = await pdfPage.getTextContent();
      if (cancelled) return;
      layerElement.replaceChildren();
      textLayer = new pdfjs.TextLayer({ textContentSource: content, container: layerElement, viewport });
      await textLayer.render();
      if (cancelled) return;
      marksElement.replaceChildren();
      if (!highlight || highlight.end <= page.start_offset || highlight.start >= page.end_offset) return;
      const items = content.items.filter((item): item is typeof item & PdfTextItem => 'str' in item && 'transform' in item);
      const ranges = mapPdfPageItems(items, page.text);
      if (!ranges) {
        onUnavailable('This PDF uses a text layout that cannot be mapped reliably. The verified passage is highlighted in the extracted-text view.');
        return;
      }
      const from = Math.max(0, highlight.start - page.start_offset);
      const to = Math.min(page.text.length, highlight.end - page.start_offset);
      const pageBox = outerElement.getBoundingClientRect();
      let count = 0;
      for (const item of ranges) {
        const begin = Math.max(from, item.start);
        const end = Math.min(to, item.end);
        if (begin >= end) continue;
        const div = textLayer.textDivs[item.index];
        const node = div?.firstChild;
        if (!node || node.nodeType !== Node.TEXT_NODE) continue;
        const sourceLength = node.textContent?.length ?? 0;
        const startOffset = Math.min(sourceLength, item.sourceStart + begin - item.start);
        const endOffset = Math.min(sourceLength, item.sourceStart + end - item.start);
        if (startOffset >= endOffset) continue;
        const selection = document.createRange();
        selection.setStart(node, startOffset);
        selection.setEnd(node, endOffset);
        for (const box of selection.getClientRects()) {
          if (!box.width || !box.height) continue;
          const mark = document.createElement('span');
          mark.className = 'pdf-citation-highlight';
          mark.dataset.citationTarget = 'true';
          mark.setAttribute('aria-label', `Verified citation on page ${page.page_no}`);
          mark.style.left = `${box.left - pageBox.left}px`;
          mark.style.top = `${box.top - pageBox.top}px`;
          mark.style.width = `${box.width}px`;
          mark.style.height = `${box.height}px`;
          marksElement.append(mark);
          count++;
        }
      }
      if (!count) {
        onUnavailable('The verified quote could not be placed on the rendered page. It is highlighted in the extracted-text view.');
      } else if (highlight.start >= page.start_offset && highlight.start < page.end_offset) {
        requestAnimationFrame(() => marksElement.querySelector('[data-citation-target="true"]')?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
      }
    };
    render().catch(error => {
      if (!cancelled && error?.name !== 'RenderingCancelledException') onUnavailable('The original PDF could not be rendered. The extracted-text view is available.');
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
    };
  }, [pdf, pdfjs, page, width, highlight, onUnavailable]);

  return <article className="pdf-canvas-page" ref={outer} aria-label={`Original PDF page ${page.page_no}`}>
    <canvas ref={canvas} aria-hidden="true" />
    <div ref={layer} className="pdf-text-layer" style={{ height }} aria-hidden="true" />
    <div ref={marks} className="pdf-highlight-layer" style={{ height }} />
    <div className="pdf-page-number">Page {page.page_no}</div>
  </article>;
}

export function PdfViewer({ docId, size, pages, highlight, onUnavailable }: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pdfjs, setPdfjs] = useState<PdfModule | null>(null);
  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    const load = async () => {
      setPdf(null);
      const pdfModule = await import('pdfjs-dist');
      pdfModule.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const bytes = new Uint8Array(size);
      const chunkSize = 1024 * 1024;
      for (let batch = 0; batch * chunkSize < size; batch += 4) {
        const requests = Array.from({ length: Math.min(4, Math.ceil(size / chunkSize) - batch) }, async (_, index) => {
          const start = (batch + index) * chunkSize;
          const end = Math.min(size - 1, start + chunkSize - 1);
          const response = await fetch(`/api/documents/${docId}/source?start=${start}&end=${end}`, { cache: 'no-store' });
          if (response.status !== 206) throw new Error('The original PDF is unavailable.');
          const part = new Uint8Array(await response.arrayBuffer());
          if (part.length !== end - start + 1) throw new Error('The original PDF is incomplete.');
          bytes.set(part, start);
        });
        await Promise.all(requests);
        if (cancelled) return;
      }
      const task = pdfModule.getDocument({ data: bytes });
      const document = await task.promise;
      loaded = document;
      if (cancelled) { await document.destroy(); return; }
      setPdfjs(pdfModule);
      setPdf(document);
    };
    load().catch(() => { if (!cancelled) onUnavailable('The original PDF could not be loaded. The extracted-text view is available.'); });
    return () => { cancelled = true; if (loaded) void loaded.destroy(); };
  }, [docId, size, onUnavailable]);
  if (!pdf || !pdfjs) return <div className="loading-reader">Opening original PDF…</div>;
  return <>{pages.map(page => <PdfPage key={page.id} pdf={pdf} pdfjs={pdfjs} page={page} highlight={highlight} onUnavailable={onUnavailable} />)}</>;
}
