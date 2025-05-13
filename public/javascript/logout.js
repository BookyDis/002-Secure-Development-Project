let csrfToken = '';

//fetch csrf token on page load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/csrf-token');
        const data = await res.json();
        csrfToken = data.csrfToken;
    } catch (err) {
        alert('Failed to fetch CSRF token');
        console.error(err);
    }
});

async function logout(event) {
    event.preventDefault(); 

    const response = await fetch('/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken
        },
        credentials: 'include'
    });

    if (response.redirected) {
        window.location.href = response.url;
    }
}
