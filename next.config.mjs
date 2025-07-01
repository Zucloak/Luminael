/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
      config.externals.push('v8');
      return config;
    }
};

export default nextConfig;
