import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root=process.cwd();
process.env.DATA_DIR??=path.join(root,'data');
const standalone=path.join(root,'.next','standalone');
const staticSource=path.join(root,'.next','static');
const staticTarget=path.join(standalone,'.next','static');
if(!fs.existsSync(path.join(standalone,'server.js')))throw new Error('Run npm run build before npm run start.');
if(fs.existsSync(staticSource))fs.cpSync(staticSource,staticTarget,{recursive:true});
if(fs.existsSync(path.join(root,'public')))fs.cpSync(path.join(root,'public'),path.join(standalone,'public'),{recursive:true});
const pdfjsSource=path.join(root,'node_modules','pdfjs-dist');
if(fs.existsSync(pdfjsSource))fs.cpSync(pdfjsSource,path.join(standalone,'node_modules','pdfjs-dist'),{recursive:true,force:true});
process.env.PORT??='3000';
await import(pathToFileURL(path.join(standalone,'server.js')).href);
