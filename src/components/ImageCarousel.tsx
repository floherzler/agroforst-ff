import { Card, CardContent } from "./ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";

export default function ImageCarousel() {
  const images = [
    ["/img/kartoffel-hänger.jpeg", "Kartoffeln"],
    ["/img/erdbeer-körbe.jpeg", "Erdbeeren"],
    ["/img/herbst.jpeg", "Herbstliche Blätter"],
    ["/img/garten-nebel.jpeg", "Nebliger Garten"],
    ["/img/schnee-feld.jpeg", "Feld im Schnee"],
  ] as const;

  return (
    <Carousel opts={{ align: "start" }} className="relative w-3/4 max-w-3xl pt-4">
      <CarouselContent>
        {images.map(([src, alt], index) => (
          <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/2">
            <div className="p-1">
              <Card className="flex aspect-video">
                <CardContent className="flex items-center justify-center p-1">
                  <img src={src} alt={alt} className="w-full h-auto rounded-lg shadow-md object-cover" />
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="text-black shadow-l" />
      <CarouselNext className="text-black" />
    </Carousel>
  );
}
