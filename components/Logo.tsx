/** Icono de la app (se usa para generar los PNG de la PWA). */
export function LogoIcono({ tamano, margen = 0 }: { tamano: number; margen?: number }) {
  const s = tamano;
  return (
    <div
      style={{
        width: s,
        height: s,
        background: "#1C1B19",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: margen ? 0 : s * 0.22,
      }}
    >
      <div
        style={{
          width: s * (1 - margen * 2) * 0.62,
          height: s * (1 - margen * 2) * 0.62,
          borderRadius: "50%",
          border: `${Math.max(2, s * 0.03)}px solid #A04A18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#F6F4EF",
          fontSize: s * (1 - margen * 2) * 0.26,
          fontFamily: "serif",
          letterSpacing: -s * 0.005,
        }}
      >
        DF
      </div>
    </div>
  );
}
