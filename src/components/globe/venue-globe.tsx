"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { VenueMapItem } from "@/types/venue";

type VenueGlobeProps = {
  venues: VenueMapItem[];
};

type CesiumWindow = Window & {
  CESIUM_BASE_URL?: string;
};

export function VenueGlobe({ venues }: VenueGlobeProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [isZoomedIn, setIsZoomedIn] = useState(false);

  useEffect(() => {
    let isActive = true;
    let cleanup: (() => void) | undefined;

    async function initializeGlobe() {
      if (!containerRef.current) {
        return;
      }

      try {
        const assetPrefix =
          process.env.NEXT_PUBLIC_ASSET_PREFIX?.replace(/\/$/, "") ?? "";
        const cesiumBaseUrl = `${assetPrefix}/Cesium/`;

        const workerProbe = await fetch(
          `${cesiumBaseUrl}Workers/createTaskProcessorWorker.js`,
          { method: "HEAD" }
        );
        if (!workerProbe.ok) {
          throw new Error(
            `Cesium worker assets are unavailable at ${cesiumBaseUrl} (status ${workerProbe.status}).`
          );
        }

        (window as CesiumWindow).CESIUM_BASE_URL = cesiumBaseUrl;

        const Cesium = await import("cesium");
        const buildModuleUrl = Cesium.buildModuleUrl as typeof Cesium.buildModuleUrl & {
          setBaseUrl?: (value: string) => void;
        };
        buildModuleUrl.setBaseUrl?.(cesiumBaseUrl);

        if (!isActive || !containerRef.current) {
          return;
        }

        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          baseLayer: new Cesium.ImageryLayer(
            new Cesium.OpenStreetMapImageryProvider({
              url: "https://tile.openstreetmap.org/",
            })
          ),
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          navigationHelpButton: false,
          projectionPicker: false,
          requestRenderMode: true,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
        });

        viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2);
        viewer.scene.postProcessStages.fxaa.enabled = true;
        viewer.scene.globe.enableLighting = true;
        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.show = true;
        }
        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 550000;
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = 30000000;
        viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
          Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
        );

        const venueEntities = venues.map((venue) =>
          viewer.entities.add({
            id: venue.slug,
            name: venue.name,
            description: venue.summary,
            position: Cesium.Cartesian3.fromDegrees(
              venue.coordinates.longitude,
              venue.coordinates.latitude,
              0
            ),
            point: {
              color: Cesium.Color.fromCssColorString("#5ea6ff"),
              outlineColor: Cesium.Color.fromCssColorString("#dfeeff"),
              outlineWidth: 2,
              pixelSize: 13,
            },
            label: {
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              fillColor: Cesium.Color.fromCssColorString("#edf3ff"),
              font: "600 15px 'Segoe UI', sans-serif",
              horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
              pixelOffset: new Cesium.Cartesian2(18, -4),
              showBackground: true,
              backgroundColor: Cesium.Color.fromCssColorString(
                "rgba(12, 18, 25, 0.78)"
              ),
              style: Cesium.LabelStyle.FILL,
              text: venue.name,
            },
          })
        );

        if (venueEntities[0]) {
          void viewer.flyTo(venueEntities, {
            duration: 0,
            offset: new Cesium.HeadingPitchRange(0, -0.85, 12000000),
          });
        }

        const zoomGuidanceHeight = 6500000;

        const updateZoomState = () => {
          const cameraHeight = viewer.camera.positionCartographic.height;
          setIsZoomedIn(cameraHeight <= zoomGuidanceHeight);
        };

        const handleSelection = (entity: { id?: unknown } | undefined) => {
          if (typeof entity?.id !== "string") {
            return;
          }

          router.push(`/venues/${entity.id}`);
        };

        updateZoomState();
        viewer.camera.changed.addEventListener(updateZoomState);
        viewer.selectedEntityChanged.addEventListener(handleSelection);
        viewer.scene.requestRender();

        cleanup = () => {
          viewer.camera.changed.removeEventListener(updateZoomState);
          viewer.selectedEntityChanged.removeEventListener(handleSelection);
          if (!viewer.isDestroyed()) {
            viewer.destroy();
          }
        };

        if (isActive) {
          setStatus("ready");
        }
      } catch (error) {
        console.error("Failed to initialize Cesium globe", error);
        if (isActive) {
          const message =
            error instanceof Error ? error.message : "Unknown Cesium startup error";
          setErrorDetails(message);
          setStatus("error");
        }
      }
    }

    void initializeGlobe();

    return () => {
      isActive = false;
      cleanup?.();
    };
  }, [router, venues]);

  return (
    <div className="globe-shell relative h-full min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[2rem]">
      <div
        ref={containerRef}
        className="h-full min-h-[calc(100vh-1.5rem)] rounded-[2rem]"
      />
      <div
        className={`pointer-events-none absolute bottom-4 right-4 max-w-[16rem] rounded-xl border border-white/15 bg-slate-950/45 px-3 py-2 text-xs leading-5 text-white/82 backdrop-blur-sm transition-opacity duration-700 sm:bottom-6 sm:right-6 ${
          status === "ready" && isZoomedIn ? "opacity-0" : "opacity-100"
        }`}
      >
        {status === "ready"
          ? "Zoom in, then tap a venue marker to open details."
          : "Loading globe..."}
      </div>
      {status === "error" ? (
        <div className="absolute inset-5 flex items-center justify-center rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-6 text-center text-sm leading-6 text-white/80">
          <p>
            Globe rendering could not start in this browser session. The venue archive remains available from the individual venue pages.
            {errorDetails ? <span className="mt-2 block text-white/65">{errorDetails}</span> : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}