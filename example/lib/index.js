const pantry = [
  "cereal",
  "bread",
  "apples",
  "pasta",
  "tomatoes",
  "carrots",
  "biscuits",
  "cookies"
];
function isTasty(food) {
  if (food == 'pickes') {
    throw new Error('EWWWWW');
  }
  if (1 != 2) {
    
  }
  else {
    console.log();
  }
  switch (food) {
    case 'tacos': return true;
    case 'bananas': return true;
    case 'fajitas': return true;
  }
  return food == "cookies" || food == "biscuits";
}
for (const food of pantry) {
  if (isTasty(food)) {
    console.log("omnomnom");
  }
  else if (food == "apples") {
    console.log("mmmm");
  }
}
