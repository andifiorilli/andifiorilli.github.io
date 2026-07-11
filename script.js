document.addEventListener("DOMContentLoaded", function () {
    const projectNav = document.querySelector(".project-nav");

    if (!projectNav) return;

    function showHomeOnly() {
        projectNav.innerHTML = '<a href="index.html" data-nav="home">home</a>';
    }

    fetch("index.html")
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Could not load the project index.");
            }

            return response.text();
        })
        .then(function (html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const projectLinks = Array.from(
                doc.querySelectorAll(".gallery .project")
            )
                .map(function (link) {
                    return link.getAttribute("href");
                })
                .filter(Boolean);

            const currentPage = window.location.pathname.split("/").pop();
            const currentIndex = projectLinks.indexOf(currentPage);

            if (currentIndex === -1) {
                showHomeOnly();
                return;
            }

            const prevIndex =
                currentIndex === 0
                    ? projectLinks.length - 1
                    : currentIndex - 1;

            const nextIndex =
                currentIndex === projectLinks.length - 1
                    ? 0
                    : currentIndex + 1;

            const prevProject = projectLinks[prevIndex];
            const nextProject = projectLinks[nextIndex];

            projectNav.innerHTML = `
                <a href="${prevProject}" data-nav="prev">← prev</a>
                <a href="index.html" data-nav="home">home</a>
                <a href="${nextProject}" data-nav="next">next →</a>
            `;
        })
        .catch(function () {
            showHomeOnly();
        });
});

document.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") {
        const prevLink = document.querySelector(
            '.project-nav a[data-nav="prev"]'
        );

        if (prevLink) {
            window.location.href = prevLink.href;
        }
    }

    if (event.key === "ArrowRight") {
        const nextLink = document.querySelector(
            '.project-nav a[data-nav="next"]'
        );

        if (nextLink) {
            window.location.href = nextLink.href;
        }
    }
});