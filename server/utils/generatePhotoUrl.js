export default (weight, height, text, textSize, textColor, bgColor) => {
  const prefix = text.slice(0, 1).toLocaleUpperCase();
  return `https://fakeimg.pl/${weight}x${height}/${bgColor}/${textColor}/?text=${prefix}&font_size=${textSize}&font=noto`;
};
