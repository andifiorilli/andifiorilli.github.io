document.addEventListener("DOMContentLoaded", function () {
    const projectNav = document.querySelector(".project-nav");

    if (!projectNav) return;

    const currentPage = window.location.pathname.split("/").pop();

    fetch("index.html")
        .then(function (response) {
            return response.text();
        })
        .then(function (html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const projectLinks = Array.from(doc.querySelectorAll(".gallery .project"))
                .map(function (link) {
                    return link.getAttribute("href");
                })
                .filter(Boolean);

            const currentIndex = projectLinks.indexOf(currentPage);

            if (currentIndex === -1) {
                projectNav.innerHTML = '<a href="index.html">home</a>';
                return;
            }

            const prevIndex = currentIndex === 0
                ? projectLinks.length - 1
                : currentIndex - 1;

            const nextIndex = currentIndex === projectLinks.length - 1
                ? 0
                : currentIndex + 1;

            const prevProject = projectLinks[prevIndex];
            const nextProject = projectLinks[nextIndex];

            projectNav.innerHTML = `
                <a href="${prevProject}">← prev</a>
                <a href="index.html">home</a>
                <a href="${nextProject}">next →</a>
            `;
        });
});

document.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") {
        const prevLink = document.querySelector(".project-nav a:first-child");

        if (prevLink) {
            window.location.href = prevLink.href;
        }
    }

    if (event.key === "ArrowRight") {
        const nextLink = document.querySelector(".project-nav a:last-child");

        if (nextLink) {
            window.location.href = nextLink.href;
        }
    }
});