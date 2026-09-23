import type { SVGProps } from "react";

const Replicate = (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 726 726" fill="#ffff">
        <g clipPath="url(#replicate_dark__clip0_1_3)">
            <path d="M726 310.438V392.476H438.068V726H346.302V310.438H726Z" />
            <path d="M726 155.219V237.402H264.845V726H173.078V155.219H726Z" />
            <path d="M726 0V82.1832H91.7664V726H0V0H726Z" />
        </g>
        <defs>
            <clipPath id="replicate_dark__clip0_1_3">
                <rect width="726" height="726" />
            </clipPath>
        </defs>
    </svg>
);

export { Replicate };
