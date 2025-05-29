let itemsPerBatch = 30;
let currentBatch = 0;
let observer;

function initLazyLoad(container, items) {
    currentBatch = 0;
    container.innerHTML = '';

    loadNextBatch(container, items);

    const sentinel = document.createElement('div');
    sentinel.className = 'lazy-sentinel';
    container.appendChild(sentinel);

    observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            loadNextBatch(container, items);
        }
    }, { rootMargin: '100px' });

    observer.observe(sentinel);
}

function loadNextBatch(container, items) {
    const start = currentBatch * itemsPerBatch;
    const end = start + itemsPerBatch;
    const batch = items.slice(start, end);

    batch.forEach(it => {
        const card = createFileCard(it);
        container.insertBefore(card, container.querySelector('.lazy-sentinel'));
    });

    currentBatch++;

    if (end >= items.length && observer) {
        observer.disconnect();
    }
}
