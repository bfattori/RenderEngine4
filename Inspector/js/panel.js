chrome.devtools.inspectedWindow.eval("document.title", function(result, isException) {
  if (!isException) {
    console.log("The page title is: ", result);
  }
  console.error(isException);
});