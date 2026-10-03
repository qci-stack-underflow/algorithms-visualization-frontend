import Hardcoded from "./harcode-class";
import "@sass/style.scss"

document.addEventListener("DOMContentLoaded", () => {
  const newClass = new Hardcoded();

  console.log("The DOM is fully loaded and parsed");
  alert(`${newClass.getMessage()}`);
});
