let csrfToken = '';

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/csrf-token');
        const data = await res.json();
        csrfToken = data.csrfToken;
        console.log('CSRF token fetched:', csrfToken);
    } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
        alert('Failed to fetch CSRF token');
        return;
    }

    const postForm = document.querySelector('#postForm');
    if (!postForm) {
        // Form is not on this page — exit early
        return;
    }

    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const titleInput = document.querySelector('#postTitle');
        const contentInput = document.querySelector('#content');

        if (!titleInput || !contentInput) {
            alert('Missing form elements');
            return;
        }

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title || !content) {
            alert('Please enter both title and content');
            return;
        }

        try {
            const res = await fetch('/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken
                },
                body: JSON.stringify({ title, content })
            });

            const data = await res.json();

            if (res.ok) {
                window.location.reload();
            } else {
                alert(data.message || 'Failed to submit post.');
            }
        } catch (err) {
            console.error('Error submitting post:', err);
            alert('Network error submitting post');
        }
    });
});

