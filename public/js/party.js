// Party Page Interactive Features
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all features (each initializer is defensive)
    try { initializeModals(); } catch (e) { console.warn('initModals error', e); }
    try { initializeAnimations(); } catch (e) { console.warn('initAnimations error', e); }
    try { initializeScrollEffects(); } catch (e) { console.warn('initScrollEffects error', e); }
});

// Search Functionality
function initializeSearch() {
    const searchInput = document.getElementById('partySearch');
    const partyCards = document.querySelectorAll('.party-card');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();

        partyCards.forEach(card => {
            const partyNameEl = card.querySelector('h2, h3');
            const partyName = partyNameEl ? (partyNameEl.textContent || '').toLowerCase() : '';
            const partyNameAmharicEl = card.querySelector('.custom-opacity-75, .opacity-75, p');
            const partyNameAmharic = partyNameAmharicEl ? (partyNameAmharicEl.textContent || '').toLowerCase() : '';
            const descEl = card.querySelector('.description-section p');
            const description = descEl ? (descEl.textContent || '').toLowerCase() : '';

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

    if (!modal) return;

    partyCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Prevent clicks originating from links inside the card (if any)
            if (e.target.closest('a')) return;
            const partyData = extractPartyData(this);
            populateModal(modal, partyData);
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';

            // Animate modal entrance
            setTimeout(() => modal.classList.add('show'), 10);
        });
    });

    // Close modal when clicking background or close button
    modal.addEventListener('click', function(e) {
        if (e.target === modal || e.target.classList.contains('custom-close')) {
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
    const nameEl = card.querySelector('h2, h3');
    const amharicEl = card.querySelector('.custom-opacity-75, .opacity-75, p');
    const logoEl = card.querySelector('.party-logo img');
    const ideologyEl = card.querySelector('.ideology-section p');
    const leaderNameEl = card.querySelector('.leader-section h6');
    const leaderAmharicEl = card.querySelector('.leader-section p');
    const leaderImageEl = card.querySelector('.leader-avatar img, .leader-avatar');
    const descEl = card.querySelector('.description-section');
    const badgeEl = card.querySelector('.badge');

    return {
        name: nameEl ? (nameEl.textContent || '').trim() : '',
        nameAmharic: amharicEl ? (amharicEl.textContent || '').trim() : '',
        logo: logoEl ? (logoEl.src || '') : '',
        ideology: ideologyEl ? (ideologyEl.textContent || '').trim() : '',
        leader: {
            name: leaderNameEl ? (leaderNameEl.textContent || '').trim() : '',
            nameAmharic: leaderAmharicEl ? (leaderAmharicEl.textContent || '').trim() : '',
            image: (leaderImageEl && leaderImageEl.src) ? leaderImageEl.src : ''
        },
        description: descEl ? descEl.innerHTML : '',
        badge: badgeEl ? (badgeEl.textContent || '').trim() : '',
        badgeClass: badgeEl ? (badgeEl.className || '') : ''
    };
}

function populateModal(modal, data) {
    const titleEl = modal.querySelector('.custom-modal-title, .modal-title');
    const logoEl = modal.querySelector('.custom-modal-logo, .modal-logo');
    const ideologyEl = modal.querySelector('.custom-modal-ideology, .modal-ideology');
    const leaderNameEl = modal.querySelector('.custom-modal-leader-name, .modal-leader-name');
    const leaderImgEl = modal.querySelector('.custom-modal-leader-image, .modal-leader-image');
    const descEl = modal.querySelector('.custom-modal-description, .modal-description');
    const badgeEl = modal.querySelector('.custom-modal-badge, .modal-badge');

    if (titleEl) titleEl.textContent = data.name;
    if (logoEl && data.logo) logoEl.src = data.logo;
    if (ideologyEl) ideologyEl.textContent = data.ideology;
    if (leaderNameEl) leaderNameEl.textContent = data.leader.name;
    if (leaderImgEl && data.leader.image) leaderImgEl.src = data.leader.image;
    if (descEl) descEl.innerHTML = data.description;
    if (badgeEl) {
        badgeEl.textContent = data.badge || '';
        if (data.badgeClass) badgeEl.className = data.badgeClass + ' custom-modal-badge';
    }
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
