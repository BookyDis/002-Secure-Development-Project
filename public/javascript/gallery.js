const galleries = {
    gallery: {
        images: [
            "https://image.tmdb.org/t/p/original/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg",
            "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
            "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
            "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
            "https://image.tmdb.org/t/p/w500/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg"
        ],
        currentIndex: 0
    }
};

function showImage(galleryName) 
{
    const gallery = galleries[galleryName];
    const imgElement = document.getElementById(galleryName + "MainImage");
    if (imgElement && gallery) 
    {
        imgElement.src = gallery.images[gallery.currentIndex];
    }
}

function prevImage(galleryName) 
{
    const gallery = galleries[galleryName];
    if (gallery) 
    {
        gallery.currentIndex = (gallery.currentIndex - 1 + gallery.images.length) % gallery.images.length;
        showImage(galleryName);
    }
}

function nextImage(galleryName) 
{
    const gallery = galleries[galleryName];
    if (gallery) 
    {
        gallery.currentIndex = (gallery.currentIndex + 1) % gallery.images.length;
        showImage(galleryName);
    }
}

function startAutoScroll(galleryName) 
{
    setInterval(() => {
        nextImage(galleryName);
    }, 10000);
}

startAutoScroll("gallery");