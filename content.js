// Content script to inject Quote Video buttons into Twitter feed
(function() {
  'use strict';

  let buttonStyle = null;
  
  // Create and inject CSS for the quote button
  function injectButtonStyles() {
    if (buttonStyle) return;
    
    buttonStyle = document.createElement('style');
    buttonStyle.textContent = `
      .quote-video-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.75);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        z-index: 1000;
        backdrop-filter: blur(4px);
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .quote-video-btn:hover {
        background: rgba(29, 161, 242, 0.9);
        transform: scale(1.05);
      }
      
      .quote-video-btn:active {
        transform: scale(0.95);
      }
      
      .quote-video-btn-icon {
        width: 14px;
        height: 14px;
      }
      
      .quote-toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1da1f2;
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideUp 0.3s ease-out;
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
    `;
    document.head.appendChild(buttonStyle);
  }

  // Show toast notification
  function showToast(message) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.quote-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'quote-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2500);
  }

  // Extract tweet URL from various contexts
  function getTweetUrl(element) {
    // Look for the tweet link in the article element
    const article = element.closest('article');
    if (!article) return null;

    // Try to find the time link which contains the tweet URL
    const timeLink = article.querySelector('time').closest('a');
    if (timeLink && timeLink.href) {
      return timeLink.href;
    }

    // Fallback: try to construct from data attributes or other methods
    const tweetId = article.querySelector('[data-testid="tweet"]');
    if (tweetId) {
      // This is a more complex extraction - might need adjustment based on Twitter's current structure
      const userLink = article.querySelector('[data-testid="User-Name"] a');
      if (userLink) {
        const username = userLink.href.split('/').pop();
        const statusMatch = window.location.href.match(/status\/(\d+)/);
        if (statusMatch) {
          return `https://x.com/${username}/status/${statusMatch[1]}`;
        }
      }
    }

    return null;
  }

  // Create quote button
  function createQuoteButton(videoElement) {
    const button = document.createElement('button');
    button.className = 'quote-video-btn';
    button.innerHTML = `
      <svg class="quote-video-btn-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.75 21V3h2v18h-2zM18 9v6h-5v2h7V7h-7v2h5z"/>
      </svg>
      Quote
    `;
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const tweetUrl = getTweetUrl(videoElement);
      if (!tweetUrl) {
        showToast('Could not find tweet URL');
        return;
      }

      try {
        const videoLink = tweetUrl + '/video/1';
        await navigator.clipboard.writeText(videoLink);
        showToast('Video quote link copied!');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        showToast('Failed to copy link');
      }
    });

    return button;
  }

  // Check if element has video content
  function hasVideo(element) {
    return element.querySelector('video') !== null;
  }

  // Add quote button to video container
  function addQuoteButton(videoContainer) {
    // Skip if button already exists
    if (videoContainer.querySelector('.quote-video-btn')) {
      return;
    }

    // Skip if this isn't actually a video tweet
    if (!hasVideo(videoContainer)) {
      return;
    }

    const button = createQuoteButton(videoContainer);
    
    // Find the best container for positioning
    const mediaContainer = videoContainer.querySelector('[data-testid="videoComponent"]') || 
                          videoContainer.querySelector('video').closest('div');
    
    if (mediaContainer) {
      // Make sure the container has relative positioning
      const containerStyle = window.getComputedStyle(mediaContainer);
      if (containerStyle.position === 'static') {
        mediaContainer.style.position = 'relative';
      }
      
      mediaContainer.appendChild(button);
    }
  }

  // Process tweets for video content
  function processTweets() {
    // Look for tweet articles that contain videos
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    
    tweets.forEach(tweet => {
      if (hasVideo(tweet)) {
        addQuoteButton(tweet);
      }
    });
  }

  // Initialize the extension
  function init() {
    // Only run on Twitter/X domains
    if (!window.location.hostname.match(/^(twitter\.com|x\.com)$/)) {
      return;
    }

    injectButtonStyles();
    
    // Process existing tweets
    processTweets();
    
    // Set up observer for dynamically loaded content
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if new tweets were added
              if (node.matches('article[data-testid="tweet"]') || 
                  node.querySelector('article[data-testid="tweet"]')) {
                shouldProcess = true;
              }
            }
          });
        }
      });
      
      if (shouldProcess) {
        // Debounce processing to avoid excessive calls
        clearTimeout(window.twitterQuoteProcessTimeout);
        window.twitterQuoteProcessTimeout = setTimeout(processTweets, 500);
      }
    });

    // Observe the main timeline container
    const timelineContainer = document.querySelector('[data-testid="primaryColumn"]') || document.body;
    observer.observe(timelineContainer, {
      childList: true,
      subtree: true
    });
  }

  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Handle navigation in SPA
  let currentUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      setTimeout(init, 1000); // Reinitialize after navigation
    }
  });
  
  urlObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

})();