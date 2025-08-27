/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
    ],
  },

  async headers() {
    return [
      {
        // Usando a sintaxe mais moderna para "todas as rotas"
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Adicionado o ponto e vírgula (;) no final do valor
            value: "frame-ancestors 'self' https://*.paddle.com;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;