(function () {
    "use strict";

    function normalizePath(hash) {
        if (!hash) return "";
        const cleaned = hash.replace(/^#/, "");
        return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
    }

    function createSuperAdminRouter(options) {
        const routes = options.routes || [];
        const onRouteChange = options.onRouteChange;
        const defaultPath = options.defaultPath || "/super-admin/dashboard";

        function matchRoute(pathname) {
            return routes.find((route) => route.path === pathname);
        }

        function navigate(pathname) {
            const safePath = pathname || defaultPath;
            if (normalizePath(window.location.hash) !== safePath) {
                window.location.hash = safePath;
            } else if (onRouteChange) {
                onRouteChange(matchRoute(safePath), safePath);
            }
        }

        function handleHashChange() {
            const current = normalizePath(window.location.hash) || defaultPath;
            const matched = matchRoute(current) || matchRoute(defaultPath);
            if (onRouteChange) {
                onRouteChange(matched, current);
            }
        }

        window.addEventListener("hashchange", handleHashChange);
        handleHashChange();

        return {
            navigate,
            current: () => normalizePath(window.location.hash) || defaultPath,
            findRoute: matchRoute
        };
    }

    window.createSuperAdminRouter = createSuperAdminRouter;
})();
