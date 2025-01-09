export default function app () {
  const gridContainer = document.getElementById('grid-container');
  const showComments = document.getElementById('show-comments');

  showComments.addEventListener('click', () => {
    showComments.classList.toggle('active')
    gridContainer.classList.toggle('show-comments')
  })
}
