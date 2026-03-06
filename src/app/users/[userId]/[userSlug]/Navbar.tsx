"use client";

import { Link, useLocation, useParams } from "@tanstack/react-router";

const Navbar = () => {
    const { userId, userSlug } = useParams({ from: "/users/$userId/$userSlug" });
    const location = useLocation();

    const items = [
        {
            name: "Profil",
            to: "/users/$userId/$userSlug" as const,
            params: { userId, userSlug },
        },
    ];

    return (
        <ul className="flex w-full shrink-0 gap-1 overflow-auto sm:w-40 sm:flex-col">
            {items.map(item => (
                <li key={item.name}>
                    <Link
                        to={item.to}
                        params={item.params}
                        className={`block w-full rounded-full px-3 py-0.5 duration-200 ${location.pathname === `/users/${userId}/${userSlug}` ? "bg-white/20" : "hover:bg-white/20"
                            }`}
                    >
                        {item.name}
                    </Link>
                </li>
            ))}
        </ul>
    );
};

export default Navbar;
