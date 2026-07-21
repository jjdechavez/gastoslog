export function toFormattedDate(dateToUpdate: string) {
  const date = new Date(dateToUpdate);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  // Convert to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'

  return `${month} ${day}, ${year} ${hours}:${minutes}${ampm}`;
}

export function fromCentToRegularPrice(
  amount: number,
  opts?: { type: "regular" | "withDecimal" },
) {
  const type = opts?.type ? opts.type : "regular";
  const cent = amount / 100;

  if (type === "withDecimal") {
    const phFormatter = new Intl.NumberFormat("fil-PH", {
      style: "currency",
      currency: "PHP",
    });

    return phFormatter.format(cent);
  }
  return cent;
}
