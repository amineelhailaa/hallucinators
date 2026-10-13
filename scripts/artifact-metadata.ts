import * as tf from '../src/engine/tf';
import {makeModel} from '../src/engine/model';
import {readFile,writeFile} from 'node:fs/promises';
await tf.setBackend('cpu');await tf.ready();
for(const task of ['classification','regression'] as const){const path=`public/runs/${task}.json`,artifact=JSON.parse(await readFile(path,'utf8')),model=makeModel(artifact.config);artifact.topology=model.toJSON(undefined,false);artifact.preprocessing={shape:[16,16,1],dtype:'float32',range:[0,1],color:'grayscale'};artifact.labels=task==='classification'?['up','right','down','left']:['x','y'];await writeFile(path,JSON.stringify(artifact));model.optimizer.dispose();model.dispose();}
console.log('Added explicit topology, preprocessing and label order to existing genuine recorded runs; metrics and weights are unchanged.');
