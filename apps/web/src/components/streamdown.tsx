import { Streamdown } from 'streamdown';
import { createCodePlugin } from '@streamdown/code';
import { cjk } from '@streamdown/cjk';
import { math } from '@streamdown/math';
import { mermaid } from '@streamdown/mermaid';
import 'katex/dist/katex.min.css';

const codePlugin = createCodePlugin({
    themes: ['github-light', 'github-dark'], // [light, dark]
});

export default function StreamdownRenderer({ markdown, isStreaming }: { markdown: string; isStreaming: boolean }) {
    return (
        <Streamdown
            animated={{ animation: 'blurIn', sep: 'char' }}
            plugins={{
                code: codePlugin,
                cjk,
                math,
                mermaid,
            }}
            isAnimating={isStreaming}
        >
            {markdown}
        </Streamdown>
    );
}
