function loadComponent(id, file) {
    fetch(file)
        .then((response) => response.text())
        .then((data) => {
            document.getElementById(id).innerHTML = data;

            if (id === 'header') {
                initMenu();
            }
        });
}

loadComponent('header', 'header.html');
loadComponent('footer', 'footer.html');
loadComponent('floating-button', 'floating-button.html');
function initMenu() {
    const toggle = document.getElementById('menuToggle');
    const menu = document.getElementById('menu');
    const overlay = document.getElementById('menuOverlay');
    const closeBtn = document.getElementById('closeMenuBtn');

    if (!toggle || !menu || !overlay) return;

    toggle.onclick = function () {
        menu.classList.toggle('active');
        overlay.classList.toggle('active');
    };

    const closeMenu = function () {
        menu.classList.remove('active');
        overlay.classList.remove('active');
    };

    overlay.onclick = closeMenu;

    if (closeBtn) {
        closeBtn.onclick = closeMenu;
    }
}

/* TESTIMONIAL SLIDER */
function initTestimonials() {
    const testimonials = document.querySelectorAll('.testimonial');
    if (testimonials.length === 0) return;

    let current = 0;
    setInterval(() => {
        testimonials[current].classList.remove('active');
        current = (current + 1) % testimonials.length;
        testimonials[current].classList.add('active');
    }, 4000);
}

document.addEventListener('DOMContentLoaded', initTestimonials);
/* HERO SLIDER */
let heroInterval;
function initHeroSlider() {
    let slides = document.querySelectorAll('.slide');
    let dots = document.querySelectorAll('.dot');
    let currentSlide = 0;

    if (slides.length === 0) return;

    function showSlide(index) {
        slides.forEach((slide) => slide.classList.remove('active'));
        dots.forEach((dot) => dot.classList.remove('active'));

        slides[index].classList.add('active');
        if (dots[index]) dots[index].classList.add('active');
        currentSlide = index;
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
            clearInterval(heroInterval);
            heroInterval = setInterval(nextSlide, 3000);
        });
    });

    if (heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(nextSlide, 3000);

    // Show first slide immediately
    showSlide(0);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelectorAll('.slide').length > 0) {
        initHeroSlider();
    }
});

/* COUNTER ANIMATION – FIXED VERSION */
const counters = document.querySelectorAll('.counter');

const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                counters.forEach((counter) => {
                    counter.innerText = '0'; // reset if needed
                    const target = parseInt(counter.getAttribute('data-target')) || 0;
                    if (target === 0) {
                        counter.innerText = '0';
                        return;
                    }

                    let count = 0;
                    const duration = 1800; // total animation time in ms
                    const stepTime = 20; // update every 20ms
                    const increment = target / (duration / stepTime);

                    const update = () => {
                        count += increment;
                        counter.innerText = Math.ceil(count);
                        if (count < target) {
                            setTimeout(update, stepTime);
                        } else {
                            counter.innerText = target;
                        }
                    };

                    update();
                });
                observer.unobserve(entry.target); // run only once
            }
        });
    },
    { threshold: 0.1 }
);

document.querySelectorAll('.stats, .stat-section, .facility-stats').forEach((section) => {
    observer.observe(section);
});

/* SCROLL REVEAL ANIMATION */

function revealSections() {
    let reveals = document.querySelectorAll('.reveal');

    for (let i = 0; i < reveals.length; i++) {
        let windowHeight = window.innerHeight;
        let elementTop = reveals[i].getBoundingClientRect().top;
        let elementVisible = 120;

        if (elementTop < windowHeight - elementVisible) {
            reveals[i].classList.add('active');
        }
    }
}

window.addEventListener('scroll', revealSections);

/* SMOOTH SCROLL FOR MENU LINKS */

document.querySelectorAll('nav a').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
        let target = this.getAttribute('href');

        if (target.startsWith('#')) {
            e.preventDefault();

            document.querySelector(target).scrollIntoView({
                behavior: 'smooth',
            });
        }
    });
});

/* HEADER SHADOW WHEN SCROLLING */

window.addEventListener('scroll', function () {
    let header = document.querySelector('header');

    if (window.scrollY > 50) {
        header.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
    } else {
        header.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    }
});
//#about Page Timeline Funtion//

function revealTimeline() {
    let items = document.querySelectorAll('.timeline-item');

    items.forEach((item) => {
        let windowHeight = window.innerHeight;
        let elementTop = item.getBoundingClientRect().top;
        let visible = 100;

        if (elementTop < windowHeight - visible) {
            item.classList.add('active');
        }
    });
}

window.addEventListener('scroll', revealTimeline);

revealTimeline();
