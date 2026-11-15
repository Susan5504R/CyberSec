
const searchInput = document.getElementById("search");
const sampleButton = document.getElementById("sample");

sampleButton.addEventListener("click", () => {
    searchInput.value =
        "<script>alert('Reflected XSS')</script>";
});
