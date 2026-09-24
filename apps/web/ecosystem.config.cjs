module.exports = {
    apps: [
        {
            name: 'nas-web',
            cwd: __dirname,
            script: 'npx',
            args: 'vite preview --host 0.0.0.0 --port 4173',
            env: {
                NODE_ENV: 'production',
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '256M',
            error_file: './logs/web-error.log',
            out_file: './logs/web-out.log',
            merge_logs: true,
            time: true,
        },
    ],
};
