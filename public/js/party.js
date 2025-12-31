// Party Page Interactive Features
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all features
    initializeModals();
    initializeAnimations();
    initializeScrollEffects();
});

// Search Functionality
function initializeSearch() {
    const searchInput = document.getElementById('partySearch');
    const partyCards = document.querySelectorAll('.party-card');

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();

        partyCards.forEach(card => {
            const partyName = card.querySelector('h3').textContent.toLowerCase();
            const partyNameAmharic = card.querySelector('p.opacity-75').textContent.toLowerCase();
            const description = card.querySelector('.description-section p').textContent.toLowerCase();

            const matches = partyName.includes(searchTerm) ||
                          partyNameAmharic.includes(searchTerm) ||
                          description.includes(searchTerm);

            if (matches || searchTerm === '') {
                card.style.display = 'block';
                card.style.animation = 'fadeInUp 0.5s ease-out';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// Filter Functionality
function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const partyCards = document.querySelectorAll('.party-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filterType = this.dataset.filter;

            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            partyCards.forEach(card => {
                const badge = card.querySelector('.badge');
                const badgeText = badge ? badge.textContent.toLowerCase() : '';

                if (filterType === 'all' ||
                    (filterType === 'ruling' && badgeText.includes('ruling')) ||
                    (filterType === 'opposition' && badgeText.includes('opposition')) ||
                    (filterType === 'regional' && badgeText.includes('regional'))) {
                    card.style.display = 'block';
                    card.style.animation = 'slideInUp 0.5s ease-out';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// Modal Functionality
function initializeModals() {
    const partyCards = document.querySelectorAll('.party-card');
    const modal = document.getElementById('partyModal');

    partyCards.forEach(card => {
        card.addEventListener('click', function() {
            const partyData = extractPartyData(this);
            populateModal(modal, partyData);
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';

            // Animate modal entrance
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        });
    });

    // Close modal
    modal.addEventListener('click', function(e) {
        if (e.target === modal || e.target.classList.contains('close')) {
            closeModal(modal);
        }
    });

    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeModal(modal);
        }
    });
}

function extractPartyData(card) {
    return {
        name: card.querySelector('h3').textContent,
        nameAmharic: card.querySelector('p.opacity-75').textContent,
        logo: card.querySelector('.party-logo img').src,
        ideology: card.querySelector('.ideology-section p').textContent,
        leader: {
            name: card.querySelector('.leader-section h6').textContent,
            nameAmharic: card.querySelector('.leader-section p').textContent,
            image: card.querySelector('.leader-avatar').src
        },
        description: card.querySelector('.description-section').innerHTML,
        badge: card.querySelector('.badge').textContent,
        badgeClass: card.querySelector('.badge').className
    };
}

function populateModal(modal, data) {
    modal.querySelector('.modal-title').textContent = data.name;
    modal.querySelector('.modal-logo').src = data.logo;
    modal.querySelector('.modal-ideology').textContent = data.ideology;
    modal.querySelector('.modal-leader-name').textContent = data.leader.name;
    modal.querySelector('.modal-leader-image').src = data.leader.image;
    modal.querySelector('.modal-description').innerHTML = data.description;

    const badge = modal.querySelector('.modal-badge');
    badge.textContent = data.badge;
    badge.className = `badge ${data.badgeClass.split(' ').slice(1).join(' ')}`;
}

function closeModal(modal) {
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Animation Enhancements
function initializeAnimations() {
    // Add intersection observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.party-card').forEach(card => {
        observer.observe(card);
    });
}

// Scroll Effects
function initializeScrollEffects() {
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Navbar shrink effect
        if (scrollTop > 100) {
            navbar.classList.add('navbar-shrink');
        } else {
            navbar.classList.remove('navbar-shrink');
        }

        // Parallax effect for hero section
        const hero = document.querySelector('.hero-section');
        if (hero) {
            hero.style.transform = `translateY(${scrollTop * 0.5}px)`;
        }

        lastScrollTop = scrollTop;
    });
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add loading animation
function showLoading(card) {
    card.classList.add('loading');
    setTimeout(() => {
        card.classList.remove('loading');
    }, 1000);
}

// Enhanced hover effects
document.querySelectorAll('.party-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) rotateX(5deg)';
    });

    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) rotateX(0)';
    });
});
