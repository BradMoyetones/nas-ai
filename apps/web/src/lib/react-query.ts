import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60000,
            refetchOnWindowFocus: true,
            retry: 1
        },
    },
})

export default queryClient