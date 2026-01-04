import MaxWidthWrapper from '../MaxWidthWrapper';

const testimonials = [
    {
        quote: "We used to chase approvals across email and Slack. Now every decision has one clean receipt.",
        name: "Maya Patel",
        title: "IT Ops Manager",
        avatar: "/users/avatar_default_1.png",
        className: "border-blue-200 bg-blue-50",
    },
    {
        quote: "Handovers are easier because the why, who, and when are all in one place.",
        name: "David Kim",
        title: "Infrastructure Lead",
        avatar: "/users/avatar_default_2.webp",
        className: "border-emerald-200 bg-emerald-50",
    },
    {
        quote: "The email summary reads like the decision itself. It feels as fast as sending a follow-up email.",
        name: "Elena Rossi",
        title: "Operations Director",
        avatar: "/users/avatar_default_4.webp",
        className: "border-amber-200 bg-amber-50",
    },
    {
        quote: "Audit requests are easy now. I just send the decision link or print view.",
        name: "Jordan Lee",
        title: "Security Manager",
        avatar: "/users/avatar_default_5.webp",
        className: "border-violet-200 bg-violet-50",
    },
    {
        quote: "We still use Jira, but Decidex is the system of record for approvals.",
        name: "Priya Nair",
        title: "Service Delivery Manager",
        avatar: "/users/avatar_default_6.webp",
        className: "border-cyan-200 bg-cyan-50",
    },
    {
        quote: "It’s the decision log we kept trying to build in Google Docs — finally reliable.",
        name: "Chris Alvarez",
        title: "Ops Lead",
        avatar: "/users/john.png",
        className: "border-rose-200 bg-rose-50",
    },
];

function Testimonials() {
    return (
        <MaxWidthWrapper>
            <div className='text-center space-y-5 my-14' id='testimonials'>
                <h1 className='font-bold text-4xl'>Teams trust Decidex for decision receipts</h1>
                <h2 className='font-semibold text-xl'>A simple record of who approved what, without slowing work down.</h2>
            </div>

            <ul className='mx-auto md:columns-2 lg:columns-3 space-y-4 md:space-y-6 md:gap-6'>
                {testimonials.map((item) => (
                    <li className='break-inside-avoid' key={item.name}>
                        <figure className={`relative h-full w-full max-w-[500px] rounded-xl border p-6 ${item.className}`}>
                            <blockquote className='border-b pb-4 font-semibold text-lg'>
                                {item.quote}
                            </blockquote>
                            <figcaption>
                                <div className='flex items-center gap-4 mt-4'>
                                    <img src={item.avatar} alt={item.name} className="inline-block shrink-0 pointer-events-none h-12 w-12 rounded-full" />
                                    <div className="flex flex-col">
                                        <p className='font-semibold'>{item.name}</p>
                                        <p className='text-sm'>{item.title}</p>
                                    </div>
                                </div>
                            </figcaption>
                        </figure>
                    </li>
                ))}
            </ul>
        </MaxWidthWrapper>
    );
}

export default Testimonials;
