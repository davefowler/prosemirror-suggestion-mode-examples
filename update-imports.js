const fs = require('fs');
const path = require('path');

// Define the directories to process
const directories = [
  'examples/simple',
  'examples/suggestEdit',
  'examples/inkAndSwitch'
];

// Process each directory
directories.forEach(dir => {
  const files = fs.readdirSync(dir);
  
  // Process each TypeScript file
  files.forEach(file => {
    if (file.endsWith('.ts')) {
      const filePath = path.join(dir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Update import paths
      content = content.replace(/from ['"]\.\.\/\.\.\/(suggestions|schema|tools|styles\/[^'"]+)['"]/g, 
                               (match, p1) => {
                                 if (p1.startsWith('styles/')) {
                                   return `from '@src/${p1}'`;
                                 }
                                 return `from '@src/${p1}'`;
                               });
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, content);
      console.log(`Updated imports in ${filePath}`);
    }
  });
});

console.log('All import paths have been updated!');
