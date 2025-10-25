import { Card, CardContent } from "./ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import Image from "next/image";

export default function ImageCarousel() {
  return (
    <Carousel
      opts={{
        align: "start",
      }}
      className="relative w-full max-w-4xl pt-4"
    >
      <CarouselContent>
        <CarouselItem key={1} className="md:basis-1/2 lg:basis-1/2">
          <div className="p-1">
            <Card className="flex aspect-video overflow-hidden border-none shadow-lg">
              <CardContent className="flex items-center justify-center p-1">
                <Image
                  src="/img/kartoffel-hänger.jpeg"
                  alt="Kartoffelernte"
                  width={800}
                  height={450}
                  className="h-full w-full rounded-lg object-cover shadow-md"
                />
              </CardContent>
            </Card>
          </div>
        </CarouselItem>
        <CarouselItem key={2} className="md:basis-1/2 lg:basis-1/2">
          <div className="p-1">
            <Card className="flex aspect-video overflow-hidden border-none shadow-lg">
              <CardContent className="flex items-center justify-center p-1">
                <Image
                  src="/img/erdbeer-körbe.jpeg"
                  alt="Erdbeeren"
                  width={800}
                  height={450}
                  className="h-full w-full rounded-lg object-cover shadow-md"
                />
              </CardContent>
            </Card>
          </div>
        </CarouselItem>
        <CarouselItem key={3} className="md:basis-1/2 lg:basis-1/2">
          <div className="p-1">
            <Card className="flex aspect-video overflow-hidden border-none shadow-lg">
              <CardContent className="flex items-center justify-center p-1">
                <Image
                  src="/img/herbst.jpeg"
                  alt="Herbstliche Blätter"
                  width={800}
                  height={450}
                  className="h-full w-full rounded-lg object-cover shadow-md"
                />
              </CardContent>
            </Card>
          </div>
        </CarouselItem>
        <CarouselItem key={4} className="md:basis-1/2 lg:basis-1/2">
          <div className="p-1">
            <Card className="flex aspect-video overflow-hidden border-none shadow-lg">
              <CardContent className="flex items-center justify-center p-1">
                <Image
                  src="/img/garten-nebel.jpeg"
                  alt="Nebliger Garten"
                  width={800}
                  height={450}
                  className="h-full w-full rounded-lg object-cover shadow-md"
                />
              </CardContent>
            </Card>
          </div>
        </CarouselItem>
        <CarouselItem key={5} className="md:basis-1/2 lg:basis-1/2">
          <div className="p-1">
            <Card className="flex aspect-video overflow-hidden border-none shadow-lg">
              <CardContent className="flex items-center justify-center p-1">
                <Image
                  src="/img/schnee-feld.jpeg"
                  alt="Feld im Schnee"
                  width={800}
                  height={450}
                  className="h-full w-full rounded-lg object-cover shadow-md"
                />
              </CardContent>
            </Card>
          </div>
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious className="text-black shadow-l" />
      <CarouselNext className="text-black" />
    </Carousel>
  );
}
