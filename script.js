
// NASA API endpoints
const NASA_API_SEARCH = 'https://images-api.nasa.gov/search';
const NASA_API_ASSET = 'https://images-api.nasa.gov/asset/';

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const imageGrid = document.getElementById('image-grid');
const loadingElement = document.getElementById('loading');
const resultsTitle = document.getElementById('results-title');
const resultsContainer = document.getElementById('results-container');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const modalDate = document.getElementById('modal-date');
const modalLink = document.getElementById('modal-link');
const closeButton = document.querySelector('.close-button');
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');

// State variables
let currentSearch = '';
let currentPage = 1;
let totalPages = 1;
let itemsPerPage = 20;

// Initialize the application
function init() {
    // Load featured images on page load
    fetchFeaturedImages();
    
    // Event listeners
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            closeModal();
        }
    });
    
    prevPageButton.addEventListener('click', goToPreviousPage);
    nextPageButton.addEventListener('click', goToNextPage);
}

// Fetch featured space images
async function fetchFeaturedImages() {
    showLoading();
    
    try {
        // Get some interesting featured searches
        const featuredSearches = ['galaxy', 'nebula', 'mars', 'earth', 'apollo'];
        const randomSearch = featuredSearches[Math.floor(Math.random() * featuredSearches.length)];
        
        const response = await fetch(`${NASA_API_SEARCH}?q=${randomSearch}&media_type=image&page=1&page_size=${itemsPerPage}`);
        const data = await response.json();
        
        processSearchResults(data, `Featured: ${randomSearch.charAt(0).toUpperCase() + randomSearch.slice(1)}`);
    } catch (error) {
        console.error('Error fetching featured images:', error);
        imageGrid.innerHTML = `<p class="error-message">Error loading images. Please try again later.</p>`;
    } finally {
        hideLoading();
    }
}

// Perform search when user submits the form
function performSearch() {
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm) {
        currentSearch = searchTerm;
        currentPage = 1;
        fetchSearchResults(searchTerm, currentPage);
    }
}

// Fetch search results from NASA API
async function fetchSearchResults(query, page) {
    showLoading();
    
    try {
        const response = await fetch(`${NASA_API_SEARCH}?q=${encodeURIComponent(query)}&media_type=image&page=${page}&page_size=${itemsPerPage}`);
        const data = await response.json();
        
        processSearchResults(data, `Results for: ${query}`);
    } catch (error) {
        console.error('Error fetching search results:', error);
        imageGrid.innerHTML = `<p class="error-message">Error searching for "${query}". Please try again later.</p>`;
    } finally {
        hideLoading();
    }
}

// Process and display search results
function processSearchResults(data, title) {
    imageGrid.innerHTML = '';
    resultsTitle.textContent = title;
    
    if (!data.collection || !data.collection.items || data.collection.items.length === 0) {
        imageGrid.innerHTML = `<p class="no-results">No images found. Try a different search term.</p>`;
        updatePagination(0, 0);
        return;
    }
    
    // Update pagination
    const totalHits = data.collection.metadata?.total_hits || data.collection.items.length;
    totalPages = Math.ceil(totalHits / itemsPerPage);
    updatePagination(currentPage, totalPages);
    
    // Create image cards
    data.collection.items.forEach(item => {
        if (item.links && item.data && item.links[0]?.href && item.data[0]) {
            const imageData = item.data[0];
            const imageHref = item.links[0].href;
            const nasaId = imageData.nasa_id;
            
            const imageCard = document.createElement('div');
            imageCard.className = 'image-card';
            imageCard.addEventListener('click', () => openImageDetails(nasaId));
            
            imageCard.innerHTML = `
                <img src="${imageHref}" alt="${imageData.title || 'NASA Image'}">
                <div class="image-info">
                    <h3 title="${imageData.title || 'Untitled'}">${imageData.title || 'Untitled'}</h3>
                    <p>${formatDate(imageData.date_created)}</p>
                </div>
            `;
            
            imageGrid.appendChild(imageCard);
        }
    });
}

// Open image details modal
async function openImageDetails(nasaId) {
    showLoading();
    
    try {
        // Fetch asset information
        const response = await fetch(`${NASA_API_ASSET}${nasaId}`);
        const data = await response.json();
        
        if (!data.collection || !data.collection.items) {
            throw new Error('No image details found');
        }
        
        // Get the original image (or the largest available)
        let originalImage = data.collection.items.find(item => 
            item.href.includes('~orig') || item.href.includes('~large'));
        
        if (!originalImage) {
            originalImage = data.collection.items[0];
        }
        
        // Fetch metadata
        const metadataResponse = await fetch(`${NASA_API_SEARCH}?nasa_id=${nasaId}`);
        const metadataData = await metadataResponse.json();
        const metadata = metadataData.collection.items[0]?.data[0] || {};
        
        // Update modal content
        modalImage.src = originalImage ? originalImage.href : '';
        modalTitle.textContent = metadata.title || 'Untitled';
        modalDescription.textContent = metadata.description || 'No description available.';
        modalDate.textContent = metadata.date_created ? `Date: ${formatDate(metadata.date_created)}` : '';
        modalLink.href = originalImage ? originalImage.href : '#';
        
        // Show modal
        imageModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    } catch (error) {
        console.error('Error fetching image details:', error);
        alert('Error loading image details. Please try again later.');
    } finally {
        hideLoading();
    }
}

// Close the modal
function closeModal() {
    imageModal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
}

// Go to previous page
function goToPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        fetchSearchResults(currentSearch, currentPage);
    }
}

// Go to next page
function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        fetchSearchResults(currentSearch, currentPage);
    }
}

// Update pagination controls
function updatePagination(current, total) {
    pageInfo.textContent = total > 0 ? `Page ${current} of ${total}` : 'No results';
    prevPageButton.disabled = current <= 1;
    nextPageButton.disabled = current >= total;
}

// Format date string
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Show loading indicator
function showLoading() {
    loadingElement.style.display = 'block';
}

// Hide loading indicator
function hideLoading() {
    loadingElement.style.display = 'none';
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
