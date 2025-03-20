const searchBar = document.getElementById("searchBar");
const pages = [
    {view: "/", name: "Home", content: "home login sign up movies posts reviews"},
    {view: "/postsPage", name: "Post Page", content: "make a posts add delete edit"},
];

searchBar.addEventListener("keyup", (e) =>
{
    const input = e.target.value.toLowerCase();
    const filteredPages = pages.filter(page => 
    {
        return page.name.toLowerCase().includes(input) || page.content.toLowerCase().includes(input);
    })

    const dropdown = document.getElementById("searchDropdown");
    dropdown.innerHTML = '';

    if (input.length > 0 && filteredPages.length > 0) 
        {
        filteredPages.forEach(page => {
            const listItem = document.createElement("li");
            const link = document.createElement("a");
            link.href = page.view;  
            link.textContent = `${page.name}`; 
            listItem.appendChild(link);
            dropdown.appendChild(listItem);
        });
        dropdown.style.display = "block";
    } 
    else 
    {
        dropdown.style.display = "none";
    }
})