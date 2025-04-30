fetch('movies.json')
  .then(response => response.json())
  .then(data => {
    const container = document.getElementById('movie-list');
    data.forEach(movie => {
      container.innerHTML += `
        <div class="movie-card">
          <img src="${movie.image}" alt="Cover of ${movie.name}" style="width:150px; height:auto;">
          <h3>${movie.name} (${movie.date})</h3>
          <p><strong>Genre:</strong> ${movie.genre}</p>
          <p><strong>Director:</strong> ${movie.director}</p>
          <p><strong>Lead Actors:</strong> ${movie.leadActors.join(', ')}</p>
        </div>
      `;
    });
  })
  .catch(error => {
    console.error('Error loading movies:', error);
  });