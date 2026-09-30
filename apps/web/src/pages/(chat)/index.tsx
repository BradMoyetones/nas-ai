import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import ChatClient from "./components/chat-client";
import { aiService, conversationService } from "@/lib/axios";
import { toast } from "sonner";

export default function Chat() {
    const params = useParams();
    const navigate = useNavigate();

    const { data: modelsCategories } = useQuery({
        queryKey: ['ai-models'],
        queryFn: async () => {
            try {
                const res = await aiService.getModels();
                return res.categories;
            } catch (error) {
                console.log(error);
                return [];
            }
        },
    });

    const { data, isLoading } = useQuery({
        queryKey: ['conversation', params.conversationId],
        queryFn: async () => {
            try {
                const res = await conversationService.getById(params.conversationId!);
                return res;
            } catch (error: any) {
                console.log(error);
                toast.error(error?.response?.data?.error || "No se pudo obtener la conversación");
                navigate("/")
                return null;
            }
        },
        enabled: !!params.conversationId,
    });

    return (
        <ChatClient
            conversationId={params.conversationId || null}
            initialConversation={data?.conversation || null}
            isLoadingConversation={isLoading}
            modelsCategories={modelsCategories || []}
        />
    );
}
