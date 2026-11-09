var sectionChanger = document.querySelector('.section-changer');
var startSurveyButton = document.querySelector('.start_survey');

function showLoadError(message) {
    console.error(message);
    if (!sectionChanger) {
        return;
    }

    var errorMessage = sectionChanger.querySelector('.survey-load-error');
    if (!errorMessage) {
        errorMessage = document.createElement('div');
    }
    errorMessage.className = 'alert alert-danger mt-3';
    errorMessage.classList.add('survey-load-error');
    errorMessage.setAttribute('role', 'alert');
    errorMessage.textContent = 'The survey could not be loaded. Please try again.';
    if (!errorMessage.parentNode) {
        sectionChanger.appendChild(errorMessage);
    }
}

function initializeBasicInfo() {
    var carouselElement = document.getElementById('basic-info-carousel');
    var form = document.getElementById('basic-info-form');
    var previousButton = document.getElementById('basic-info-previous');
    var nextButton = document.getElementById('basic-info-next');
    var progress = document.getElementById('basic-info-progress');
    var stepLabel = document.getElementById('basic-info-step-label');
    var completionMessage = document.getElementById('basic-info-complete');

    if (!carouselElement || !form || !previousButton || !nextButton || !progress || !stepLabel || !completionMessage) {
        console.error('The basic information form is missing required survey controls.');
        return;
    }

    var steps = Array.prototype.slice.call(carouselElement.querySelectorAll('.carousel-item'));
    if (steps.length === 0) {
        console.error('The basic information carousel has no steps.');
        return;
    }
    var currentIndex = 0;
    var completed = false;
    var nextButtonMarkup = nextButton.innerHTML;
    var carousel = new bootstrap.Carousel(carouselElement, {
        interval: false,
        keyboard: false,
        touch: false,
        wrap: false
    });

    function updateControls() {
        progress.textContent = (currentIndex + 1) + ' of ' + steps.length;
        stepLabel.textContent = 'Step ' + (currentIndex + 1) + ' of ' + steps.length;
        previousButton.disabled = currentIndex === 0;
        nextButton.innerHTML = currentIndex === steps.length - 1
            ? 'Finish <i class="bi bi-check-lg ms-1" aria-hidden="true"></i>'
            : nextButtonMarkup;
    }

    carouselElement.addEventListener('slide.bs.carousel', function () {
        previousButton.disabled = true;
        nextButton.disabled = true;
    });

    carouselElement.addEventListener('slid.bs.carousel', function (event) {
        currentIndex = event.to;
        previousButton.disabled = currentIndex === 0;
        nextButton.disabled = false;
        updateControls();
    });

    nextButton.addEventListener('click', function () {
        var field = steps[currentIndex].querySelector('input, select, textarea');
        if (!field) {
            console.error('The current survey step has no input to validate.');
            return;
        }

        if (!field.checkValidity()) {
            field.reportValidity();
            return;
        }

        if (currentIndex === steps.length - 1) {
            completed = true;
            completionMessage.classList.remove('d-none');
            nextButton.disabled = true;
            return;
        }

        carousel.next();
    });

    previousButton.addEventListener('click', function () {
        if (currentIndex === 0) {
            return;
        }

        if (completed) {
            completed = false;
            completionMessage.classList.add('d-none');
            nextButton.disabled = false;
        }

        carousel.prev();
    });

    updateControls();
}

if (!sectionChanger || !startSurveyButton) {
    console.error('The survey start button or content container could not be found.');
} else {
    var isLoading = false;

    startSurveyButton.addEventListener('click', function (event) {
        event.preventDefault();
        if (isLoading) {
            return;
        }

        isLoading = true;
        startSurveyButton.classList.add('disabled');
        startSurveyButton.setAttribute('aria-disabled', 'true');

        var request = new XMLHttpRequest();
        var failureHandled = false;

        function resetStartButton() {
            isLoading = false;
            startSurveyButton.classList.remove('disabled');
            startSurveyButton.removeAttribute('aria-disabled');
        }

        function handleLoadFailure(message) {
            if (failureHandled) {
                return;
            }

            failureHandled = true;
            resetStartButton();
            showLoadError(message);
        }

        request.onreadystatechange = function () {
            if (request.readyState !== XMLHttpRequest.DONE) {
                return;
            }

            if (request.status !== 200) {
                handleLoadFailure('Unable to load basicinfo.html. HTTP status: ' + request.status);
                return;
            }

            sectionChanger.innerHTML = request.responseText;
            initializeBasicInfo();
        };
        request.onerror = function () {
            handleLoadFailure('A network error occurred while loading basicinfo.html.');
        };

        request.open('GET', 'content/basicinfo.html', true);
        request.send();
    });
}
