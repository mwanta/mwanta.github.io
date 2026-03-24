const secs = document.querySelectorAll('section[id]');
const links = document.querySelectorAll('.side-nav a');
const main = document.querySelector('.content');
const obs = new IntersectionObserver(es => {
  es.forEach(e => {
    if(e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href')==='#'+e.target.id));
  });
},{root:main,threshold:0.35});
secs.forEach(s=>obs.observe(s));

const form = document.getElementById('contact-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const response = await fetch("https://formspree.io/f/mwvrgpde", {
    method: 'POST',
    body: data,
    headers: { 'Accept': 'application/json' }
  });
  if (response.ok) {
    form.reset();
    alert('Message sent!');
  } else {
    alert('Something went wrong, please try again.');
  }
});