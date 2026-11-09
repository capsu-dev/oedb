var sectionChanger = document.querySelector('.section-changer');
var startSurveyButton = document.querySelector('.start_survey');
var ccLoadPending = false;

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

function loadCCSection(onError) {
    if (ccLoadPending) {
        return;
    }

    ccLoadPending = true;
    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
        if (request.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (request.status !== 200) {
            ccLoadPending = false;
            showLoadError('Unable to load cc.html. HTTP status: ' + request.status);
            if (onError) {
                onError();
            }
            return;
        }

        sectionChanger.innerHTML = request.responseText;
        initializeCC();
    };
    request.onerror = function () {
        ccLoadPending = false;
        showLoadError('A network error occurred while loading cc.html.');
        if (onError) {
            onError();
        }
    };

    request.open('GET', 'content/cc.html', true);
    request.send();
}

function initializeBasicInfo() {
    var carouselElement = document.getElementById('basic-info-carousel');
    var form = document.getElementById('basic-info-form');
    var previousButton = document.getElementById('basic-info-previous');
    var nextButton = document.getElementById('basic-info-next');
    var progress = document.getElementById('basic-info-progress');
    var stepLabel = document.getElementById('basic-info-step-label');
    var serviceSelect = document.getElementById('service');
    var serviceOtherInput = document.getElementById('service-other');
    var serviceOtherModalElement = document.getElementById('service-other-modal');
    var serviceOtherSaveButton = document.getElementById('service-other-save');
    var nextSectionModalElement = document.getElementById('basic-info-next-modal');
    var continueButton = document.getElementById('basic-info-continue');
    var continueButtonLabel = document.getElementById('basic-info-continue-label');
    var nextSectionStatus = document.getElementById('basic-info-next-status');

    if (!carouselElement || !form || !previousButton || !nextButton || !progress || !stepLabel ||
        !serviceSelect || !serviceOtherInput || !serviceOtherModalElement || !serviceOtherSaveButton ||
        !nextSectionModalElement || !continueButton || !continueButtonLabel || !nextSectionStatus) {
        console.error('The basic information form is missing required survey controls.');
        return;
    }

    var steps = Array.prototype.slice.call(carouselElement.querySelectorAll('.carousel-item'));
    if (steps.length === 0) {
        console.error('The basic information carousel has no steps.');
        return;
    }
    var currentIndex = 0;
    var nextSectionTimer = null;
    var redirectRequested = false;
    var nextButtonMarkup = nextButton.innerHTML;
    var carousel = new bootstrap.Carousel(carouselElement, {
        interval: false,
        keyboard: false,
        touch: false,
        wrap: false
    });
    var serviceOtherModal = new bootstrap.Modal(serviceOtherModalElement);
    var nextSectionModal = new bootstrap.Modal(nextSectionModalElement, {
        backdrop: 'static',
        keyboard: false
    });

    function continueToNextSection() {
        if (redirectRequested) {
            return;
        }

        redirectRequested = true;
        if (nextSectionTimer !== null) {
            window.clearInterval(nextSectionTimer);
            nextSectionTimer = null;
        }

        continueButton.disabled = true;
        continueButtonLabel.textContent = 'Loading...';
        nextSectionStatus.textContent = 'Loading the next part of the survey.';
        nextSectionModal.hide();
    }

    function handleNextSectionLoadError() {
        redirectRequested = false;
        continueButton.disabled = false;
        continueButtonLabel.textContent = 'Try again';
        nextSectionStatus.textContent = 'The next part could not be loaded. Please try again.';
        nextSectionStatus.className = 'alert alert-danger mt-3 mb-0';
        nextSectionModal.show();
    }

    nextSectionModalElement.addEventListener('shown.bs.modal', function () {
        if (redirectRequested) {
            return;
        }

        var secondsRemaining = 3;
        continueButtonLabel.textContent = 'Continue in ' + secondsRemaining + 's';
        nextSectionStatus.textContent = 'Continuing automatically in ' + secondsRemaining + ' seconds.';
        nextSectionTimer = window.setInterval(function () {
            secondsRemaining -= 1;
            continueButtonLabel.textContent = secondsRemaining > 0
                ? 'Continue in ' + secondsRemaining + 's'
                : 'Continuing...';
            nextSectionStatus.textContent = 'Continuing automatically in ' + secondsRemaining + ' seconds.';

            if (secondsRemaining <= 0) {
                continueToNextSection();
            }
        }, 1000);
    });

    nextSectionModalElement.addEventListener('hidden.bs.modal', function () {
        if (redirectRequested) {
            loadCCSection(handleNextSectionLoadError);
        }
    });

    continueButton.addEventListener('click', continueToNextSection);

    function showServiceOtherModal() {
        serviceOtherInput.required = true;
        serviceOtherModal.show();
    }

    serviceSelect.addEventListener('change', function () {
        if (serviceSelect.value === '3') {
            showServiceOtherModal();
        } else {
            serviceOtherInput.required = false;
            serviceOtherInput.setCustomValidity('');
        }
    });

    serviceOtherInput.addEventListener('input', function () {
        serviceOtherInput.setCustomValidity('');
    });

    serviceOtherSaveButton.addEventListener('click', function () {
        if (!serviceOtherInput.value.trim()) {
            serviceOtherInput.setCustomValidity('Please describe the service you received.');
            serviceOtherInput.reportValidity();
            return;
        }

        serviceOtherInput.setCustomValidity('');
        serviceOtherModal.hide();
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

        if (field === serviceSelect && serviceSelect.value === '3' && !serviceOtherInput.value.trim()) {
            showServiceOtherModal();
            return;
        }

        if (currentIndex === steps.length - 1) {
            continueButton.disabled = false;
            continueButtonLabel.textContent = 'Continue in 5s';
            nextSectionStatus.className = 'd-none';
            nextSectionStatus.textContent = 'Continuing automatically in 5 seconds.';
            nextSectionModal.show();
            return;
        }

        carousel.next();
    });

    previousButton.addEventListener('click', function () {
        if (currentIndex === 0) {
            return;
        }

        carousel.prev();
    });

    updateControls();
}

function initializeCC() {
    var carouselElement = document.getElementById('cc-carousel');
    var previousButton = document.getElementById('cc-previous');
    var nextButton = document.getElementById('cc-next');
    var progress = document.getElementById('cc-progress');
    var stepLabel = document.getElementById('cc-step-label');
    var completionMessage = document.getElementById('cc-complete');
    var cc1 = document.getElementById('cc1');
    var cc2 = document.getElementById('cc2');
    var cc3 = document.getElementById('cc3');
    var reasonInput = document.getElementById('cc3-reason');
    var reasonModalElement = document.getElementById('cc3-reason-modal');
    var reasonSaveButton = document.getElementById('cc3-reason-save');

    if (!carouselElement || !previousButton || !nextButton || !progress || !stepLabel || !completionMessage ||
        !cc1 || !cc2 || !cc3 || !reasonInput || !reasonModalElement || !reasonSaveButton) {
        console.error('The Citizen Charter form is missing required survey controls.');
        return;
    }

    var steps = Array.prototype.slice.call(carouselElement.querySelectorAll('.carousel-item'));
    if (steps.length !== 3) {
        console.error('The Citizen Charter carousel must contain exactly three questions.');
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
    var reasonModal = new bootstrap.Modal(reasonModalElement);

    function finishesCurrentQuestion() {
        return currentIndex === 2 ||
            (currentIndex === 0 && cc1.value === 'not-aware') ||
            (currentIndex === 1 && cc2.value === 'not-seen');
    }

    function finishCC() {
        completed = true;
        completionMessage.classList.remove('d-none');
        nextButton.disabled = true;
    }

    function updateControls() {
        progress.textContent = (currentIndex + 1) + ' of ' + steps.length;
        stepLabel.textContent = 'Question ' + (currentIndex + 1) + ' of ' + steps.length;
        previousButton.disabled = currentIndex === 0;
        nextButton.innerHTML = finishesCurrentQuestion()
            ? 'Finish <i class="bi bi-check-lg ms-1" aria-hidden="true"></i>'
            : nextButtonMarkup;
    }

    function handleAnswerChange() {
        if (completed) {
            completed = false;
            completionMessage.classList.add('d-none');
            nextButton.disabled = false;
        }
        updateControls();
    }

    cc1.addEventListener('change', handleAnswerChange);
    cc2.addEventListener('change', handleAnswerChange);
    cc3.addEventListener('change', handleAnswerChange);

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
        var field = steps[currentIndex].querySelector('select');
        if (!field) {
            console.error('The current Citizen Charter step has no answer field.');
            return;
        }

        if (!field.checkValidity()) {
            field.reportValidity();
            return;
        }

        if (currentIndex === 2 && cc3.value === 'not-used') {
            reasonModal.show();
            return;
        }

        if (finishesCurrentQuestion()) {
            finishCC();
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

    reasonInput.addEventListener('input', function () {
        reasonInput.setCustomValidity('');
    });

    reasonSaveButton.addEventListener('click', function () {
        if (!reasonInput.value.trim()) {
            reasonInput.setCustomValidity('Please tell us why you were unable to use the Citizen Charter.');
            reasonInput.reportValidity();
            return;
        }

        reasonInput.setCustomValidity('');
        reasonModal.hide();
        finishCC();
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
