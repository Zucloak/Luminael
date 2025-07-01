/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: false, // Set to false to catch TypeScript errors during build
    },
    eslint: {
        ignoreDuringBuilds: false, // Set to false to catch ESLint errors during build
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'placehold.co',
                port: '',
                pathname: '/**',
            },
        ],
    },
    webpack: (config, { isServer }) => {
        // Ensure externals is an array, as it might be undefined initially
        config.externals = Array.isArray(config.externals) ? config.externals : [];
        if (isServer) {
            // The 'v8' external was in the original mjs file.
            // It's unusual but kept for now. Might be related to specific server environment needs.
            if (!config.externals.includes('v8')) {
                config.externals.push('v8');
            }
        }

        // This is an attempt to address the pdfjs-dist topLevelAwait warning.
        // It tells Webpack to treat .mjs files from pdfjs-dist as modules.
        config.module.rules.push({
            test: /\.mjs$/,
            include: /pdfjs-dist/,
            type: "javascript/auto",
            resolve: {
                fullySpecified: false,
            }
        });

        return config;
    },
    // transpilePackages: ['pdfjs-dist'], // This is an alternative to the webpack rule above for pdfjs-dist
                                        // If the webpack rule doesn't work, this could be tried.
                                        // For now, let's try the webpack rule first.
};

export default nextConfig;
