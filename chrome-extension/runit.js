document.getElementById('fetch').addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    if (!username) {
        alert('Enter a valid username.');
        return;
    }

    try {
        // Call backend to fetch RSS and generate download links
        const response = await fetch('https://your-backend-url/fetchRSS', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
        });

        if (response.ok) {
            alert('Fetching presentations. Links will be available shortly.');
            await listPresentations(username);
        } else {
            alert('Error fetching RSS feed.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while processing the request.');
    }
});

// Fetch and display presentations with download links
async function listPresentations(username) {
    const response = await fetch(`https://your-backend-url/getDownloadLinks?username=${username}`);
    if (!response.ok) {
        alert('Error fetching presentation links.');
        return;
    }

    const data = await response.json();
    const list = document.getElementById('presentationList');
    list.innerHTML = '';
    for (const [title, links] of Object.entries(data.downloadLinks)) {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <h3>${title}</h3>
            <a href="${links.pdfLink}" download>Download PDF</a>
            <a href="${links.pptxLink}" download>Download PPTX</a>
        `;
        list.appendChild(listItem);
    }
}
