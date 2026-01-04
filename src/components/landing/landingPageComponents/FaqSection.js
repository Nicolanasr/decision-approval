"use client";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion";
import { ChevronRight } from "lucide-react";

function FaqSection() {
    const faqs = [
        {
            question: "Is this a ticketing replacement?",
            answer: "No. Decidex is a decision receipt layer that works alongside tickets and email. Keep the context and approval proof without changing your current system."
        },
        {
            question: "Who owns the decision?",
            answer: "Every decision has an owner automatically captured, and approvers are required. That makes accountability explicit without extra process."
        },
        {
            question: "What do decision emails include?",
            answer: "All decision emails include the summary, context, and a deep link, with a consistent subject format: “Decision – {Title} - {action}”."
        },
        {
            question: "Can we keep records for audits?",
            answer: "Yes. Each decision has an immutable audit trail and a print/PDF-friendly view for SharePoint or drive storage."
        },
        {
            question: "Do you integrate with Jira or Slack?",
            answer: "Not yet. The MVP focuses on a minimal decision ledger with optional related links, no integrations required."
        },
    ];

    return (
        <section className="bg-white/80 py-20" id='faq'>
            <div className="max-w-sm sm:max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-center mb-12 capitalize">Frequently Asked Questions</h1>

                <div className="space-y-4">
                    {faqs.map((faq, index) => {
                        return (
                            <div key={index} className="bg-slate-100/50 p-4 px-7 rounded-lg hover:shadow">
                                <Accordion
                                    className='flex w-full flex-col'
                                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                                    variants={{
                                        expanded: {
                                            opacity: 1,
                                            scale: 1,
                                        },
                                        collapsed: {
                                            opacity: 0,
                                            scale: 0.7,
                                        },
                                    }}
                                >
                                    <AccordionItem value='getting-started' className='py-2'>
                                        <AccordionTrigger className='w-full py-0.5 text-left text-zinc-950'>
                                            <div className='flex items-center'>
                                                <ChevronRight className='h-4 w-4 text-zinc-950 transition-transform duration-200 group-data-[expanded]:rotate-90' />
                                                <div className='ml-2 text-zinc-950 text-xl font-semibold'>
                                                    {faq.question}
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className='origin-left'>
                                            <p className='pl-6 pr-2 leading-relaxed text-zinc-500'>
                                                {faq.answer}
                                            </p>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
export default FaqSection
