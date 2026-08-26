const fs = require('fs');
const path = require('path');

const newNav = `<nav><a href="index.html">Today</a><a href="trackers.html">Trackers</a><a href="cycle-advanced.html">Cycle</a><a href="mood.html">Mood</a><a href="rewards.html">Rewards</a><a href="coach.html">Coach</a></nav>`;

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Replace any <nav>...</nav> with new consistent nav
  content = content.replace(/<nav>.*?<\/nav>/gs, newNav);
  // Fix href="#" placeholders
  content = content.replace(/href="#"\s*>Rewards/g, 'href="rewards.html">Rewards');
  content = content.replace(/href="#"\s*>Coach/g, 'href="coach.html">Coach');
  fs.writeFileSync(file, content, 'utf8');
  console.log(`✅ Fixed nav for ${file}`);
});

console.log('All nav fixed! Now add active class script:');

const activeScript = `
<script>
document.querySelectorAll('nav a').forEach(a=>{
  const current = location.pathname.split('/').pop() || 'index.html';
  if(a.getAttribute('href')===current || (current==='' && a.getAttribute('href')==='index.html')){
    a.classList.add('active');
  }
});
</script>
`;

console.log('Add this before </body> in each HTML if not already there:');
console.log(activeScript);