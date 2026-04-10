import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "LittleLedger saves us hours every week. Compliance has never been easier. The parent portal is intuitive and the automatic expiration alerts keep us ahead of deadlines.",
    author: "Sarah Martinez",
    role: "School Director",
    school: "Manhattan Schoolhouse",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  },
  {
    quote: "Finally, a system that actually works for early childhood education. The document review workflow is seamless and parents love how simple it is to upload forms.",
    author: "Michael Chen",
    role: "Operations Manager",
    school: "Brooklyn Learning Center",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
  },
  {
    quote: "We manage 3 locations and LittleLedger keeps everything organized. The compliance dashboard gives us instant visibility across all our campuses.",
    author: "Jennifer Thompson",
    role: "Regional Director",
    school: "ABC Preschools Network",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
  },
];

const Testimonials = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <span className="section-label mb-6 inline-block">
              Testimonials
            </span>
            <h2 className="mb-6">
              Trusted by Schools Nationwide
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              See what directors and administrators are saying about LittleLedger
            </p>
          </div>
          
          {/* Testimonial cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index}
                className="group hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="pt-6">
                  <Quote className="h-8 w-8 text-secondary/30 mb-4" />
                  
                  {/* Rating */}
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                    ))}
                  </div>
                  
                  {/* Quote */}
                  <p className="text-muted-foreground leading-relaxed mb-6 text-sm">
                    "{testimonial.quote}"
                  </p>
                  
                  {/* Author */}
                  <div className="border-t border-border pt-4 flex items-center gap-3">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.author}
                      className="w-12 h-12 rounded-full object-cover border-2 border-secondary/20"
                    />
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      <p className="text-sm text-primary font-medium">{testimonial.school}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
