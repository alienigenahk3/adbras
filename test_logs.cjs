const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

content = content.replace(
  'batch.set(docRef, sanitizedData);\n        writes++;',
  'batch.set(docRef, sanitizedData);\n        writes++;\n        console.log(`Writing to ${collectionName}:`, item.id);'
);

content = content.replace(
  'batch.delete(doc(db, collectionName, id));\n        writes++;',
  'batch.delete(doc(db, collectionName, id));\n        writes++;\n        console.log(`Deleting from ${collectionName}:`, id);'
);

fs.writeFileSync('src/lib/firebase.ts', content, 'utf8');
console.log('Added logging to firebase sync');
