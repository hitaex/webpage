async function fetchGitHubData() {
    const username = 'hitaex'; // Replace with your GitHub username

    // Fetch Repositories
    const reposResponse = await fetch(`https://api.github.com/users/${username}/repos`);
    const reposData = await reposResponse.json();

    const reposContainer = document.getElementById('repos');
    reposContainer.innerHTML = reposData.map(repo => `
        <div class="repo">
            <h2><a href="${repo.html_url}">${repo.name}</a></h2>
            <p>${repo.description || 'No description provided.'}</p>
        </div>
    `).join('');
}

fetchGitHubData();
