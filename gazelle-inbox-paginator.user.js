// ==UserScript==
// @name         Gazelle Inbox Paginator
// @version      1.0.1
// @description  Paginates inbox threads for Gazelle sites
// @author       guileless298
// @match        https://*/inbox.php?action=viewconv&id=*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let PAGE_SIZE = localStorage.getItem("inbox_page_size");
    if (PAGE_SIZE == null) PAGE_SIZE = 10;
    let AUTO_SCROLL = localStorage.getItem("inbox_page_scroll");
    AUTO_SCROLL = AUTO_SCROLL == null ? true : AUTO_SCROLL == "true";

    const container = document.getElementById("content").children[0];
    const linkbox = container.getElementsByClassName("linkbox")[0];
    const messages = Array.prototype.slice.call(container.getElementsByClassName("inbox_message"));

    const page_count = Math.ceil(messages.length / PAGE_SIZE);
    let current_page = page_count - 1;

    const make_strong = (text) => {
        const e = document.createElement("strong");
        e.innerText = text;
        return e;
    };

    if (page_count > 1) {
        const hash = parseInt(window.location.hash.slice(1));
        if (!isNaN(hash)) {
            const message = Math.max(1, Math.min(hash, messages.length));
            current_page = Math.floor((message - 1) / PAGE_SIZE);
        }

        const make_pager = () => {
            const pager = document.createElement("div");
            pager.classList.add("linkbox");
            pager.classList.add("pager");

            if (current_page > 0) {
                const pager_first = document.createElement("a");
                pager_first.href = "#1";
                pager_first.onclick = () => set_page(0);
                pager_first.appendChild(make_strong("<< First"));
                const pager_prev = document.createElement("a");
                pager_prev.href = "#" + ((current_page - 1) * PAGE_SIZE + 1);
                pager_prev.onclick = () => set_page(current_page - 1);
                pager_prev.classList.add("pager_prev");
                pager_prev.appendChild(make_strong("< Prev"));

                pager.appendChild(pager_first);
                pager.append(" ");
                pager.appendChild(pager_prev);
                pager.append("|");
            }

            const start = Math.max(0, current_page - 4 + Math.min(0, page_count - current_page - 5));
            const end = Math.min(start + 8, page_count - 1);

            for (let i=start; i <= end; i++) {
                if (i > start) pager.append("|");
                const s = i * PAGE_SIZE + 1;
                const e = Math.min((i+1) * PAGE_SIZE, messages.length);
                const label = s + "-" + e;
                if (i == current_page) {
                    pager.append(make_strong(label));
                } else {
                    const link = document.createElement("a");
                    link.href = "#" + (i * PAGE_SIZE + 1);
                    link.onclick = () => set_page(i);
                    link.appendChild(make_strong(label));
                    pager.appendChild(link);
                }
            }

            if (current_page < page_count - 1) {
                const pager_next = document.createElement("a");
                pager_next.href = "#" + ((current_page + 1) * PAGE_SIZE + 1);
                pager_next.onclick = () => set_page(current_page + 1);
                pager_next.classList.add("pager_next");
                pager_next.appendChild(make_strong("Next >"));
                const pager_last = document.createElement("a");
                pager_last.href = "#" + ((page_count - 1) * PAGE_SIZE + 1);
                pager_last.onclick = () => set_page(page_count - 1);
                pager_last.appendChild(make_strong("Last >>"));

                pager.append("|");
                pager.appendChild(pager_next);
                pager.append(" ");
                pager.appendChild(pager_last);
            }

            return pager;
        };

        let upper_pager = make_pager();
        const page_container = document.createElement("div");
        let lower_pager = make_pager();

        linkbox.insertAdjacentElement("afterend", upper_pager);
        upper_pager.insertAdjacentElement("afterend", page_container);
        page_container.insertAdjacentElement("afterend", lower_pager);

        const pages = [];

        for (let i=0; i < page_count; i++) {
            const page = document.createElement("div");
            if (i != current_page) page.style.display = "none";
            page_container.appendChild(page);
            pages.push(page);
        }

        messages.forEach((e, i) => {
            const page = Math.floor(i / PAGE_SIZE);
            pages[page].appendChild(e);
            e.firstElementChild.lastElementChild.prepend("[" + (i + 1) + "] ");
        });

        let supress_hash_change = false;
        const set_page = (n) => {
            if (n == current_page) return;
            if (current_page >= 0) pages[current_page].style.display = "none";
            pages[n].style.display = null;
            current_page = n;

            let new_upper_pager = make_pager();
            let new_lower_pager = make_pager();
            container.replaceChild(new_upper_pager, upper_pager);
            container.replaceChild(new_lower_pager, lower_pager);
            upper_pager = new_upper_pager;
            lower_pager = new_lower_pager;
            supress_hash_change = true;
        };

        window.addEventListener("hashchange", (e) => {
            const hash = parseInt(window.location.hash.slice(1));
            if (!isNaN(hash)) {
                if (current_page < 0 && hash > 0) {
                    enable();
                    supress_hash_change = false;
                }

                if (current_page >= 0) {
                    const message = Math.max(1, Math.min(hash, messages.length));
                    const page = Math.floor((message - 1) / PAGE_SIZE);
                    const scroll = !supress_hash_change;
                    set_page(page);
                    if (scroll) messages[message - 1].scrollIntoView();
                }
            }
            supress_hash_change = false;
        });

        const disable = () => {
            upper_pager.style.display = "none";
            lower_pager.style.display = "none";
            linkbox.replaceChild(enable_btn, disable_btn);
            pages.forEach((e) => {
                e.style.display = null;
            });
            current_page = -1;
        };

        const enable = () => {
            upper_pager.style.display = null;
            lower_pager.style.display = null;
            linkbox.replaceChild(disable_btn, enable_btn);
            pages.forEach((e) => {
                e.style.display = "none";
            });
            set_page(0);
        };

        const disable_btn = document.createElement("a");
        disable_btn.href = "#0";
        disable_btn.onclick = disable;
        disable_btn.innerText = "Disable Pagination";
        const enable_btn = document.createElement("a");
        enable_btn.href = "#1";
        enable_btn.onclick = enable;
        enable_btn.innerText = "Enable Pagination";
        linkbox.appendChild(disable_btn);

        if (hash == 0) {
            disable();
        } else if (!isNaN(hash)) {
            const message = Math.max(1, Math.min(hash, messages.length));
            messages[message - 1].scrollIntoView();
        } else if (AUTO_SCROLL) {
            messages[messages.length - 1].scrollIntoView({behavior: "smooth"});
        }
    }

    const settings = document.createElement("div");
    settings.style.display = "none";
    settings.classList.add("box");
    settings.classList.add("vertical_space");
    const settings_head = document.createElement("div");
    settings_head.classList.add("head");
    settings_head.append(make_strong("Pagination Settings"));
    settings.appendChild(settings_head);
    const settings_body = document.createElement("div");
    settings_body.classList.add("body");
    settings.appendChild(settings_body);
    const settings_page_size = document.createElement("div");
    const settings_page_size_i = document.createElement("input");
    settings_page_size_i.type = "text";
    settings_page_size_i.value = PAGE_SIZE;
    settings_page_size.append("Page size: ");
    settings_page_size.appendChild(settings_page_size_i);
    settings_body.appendChild(settings_page_size);
    const settings_scroll = document.createElement("div");
    const settings_scroll_i = document.createElement("input");
    settings_scroll_i.type = "checkbox";
    settings_scroll_i.checked = AUTO_SCROLL;
    settings_scroll.append("Scroll to latest on page load: ");
    settings_scroll.appendChild(settings_scroll_i);
    settings_body.appendChild(settings_scroll);
    const settings_save = document.createElement("button");
    settings_save.innerText = "Save";
    settings_save.onclick = () => {
        const new_page_size = Math.max(3, Math.floor(settings_page_size_i.value));
        if (!isNaN(new_page_size)) localStorage.setItem("inbox_page_size", new_page_size);
        localStorage.setItem("inbox_page_scroll", settings_scroll_i.checked);
        window.location.reload();
    };
    settings_body.append(" ");
    settings_body.appendChild(settings_save);
    linkbox.insertAdjacentElement("afterend", settings);

    const settings_btn = document.createElement("a");
    settings_btn.href = "#";
    settings_btn.onclick = () => {
        if (settings.style.display == "none") {
            settings.style.display = null;
        } else {
            settings.style.display = "none";
        }
    };
    settings_btn.innerText = "Pagination Settings";
    linkbox.appendChild(settings_btn);
})();
