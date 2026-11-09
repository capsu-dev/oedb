var sectionChanger = document.querySelector('.section-changer');
var startSurveyButton = document.querySelector('.start_survey');
var ccLoadPending = false;
var sqdLoadPending = false;
var remarksLoadPending = false;
var activeSection = null;
var sectionHistory = [];
var forwardSections = [];

function animateSection(direction) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !sectionChanger.animate) {
        return;
    }

    sectionChanger.animate(
        [
            { opacity: 0, transform: 'translateX(' + (direction === 'back' ? '-1.5rem' : '1.5rem') + ')' },
            { opacity: 1, transform: 'translateX(0)' }
        ],
        { duration: 350, easing: 'ease-out' }
    );
}

function captureControlValues() {
    return Array.prototype.map.call(
        sectionChanger.querySelectorAll('input, select, textarea'),
        function (control) {
            return {
                value: control.value,
                checked: 'checked' in control ? control.checked : undefined
            };
        }
    );
}

function restoreControlValues(values) {
    var controls = sectionChanger.querySelectorAll('input, select, textarea');
    Array.prototype.forEach.call(controls, function (control, index) {
        if (!values[index]) {
            return;
        }

        control.value = values[index].value;
        if (values[index].checked !== undefined) {
            control.checked = values[index].checked;
        }
    });
}

function initializeSection(stage) {
    if (stage === 'basicinfo') {
        initializeBasicInfo();
    } else if (stage === 'cc') {
        initializeCC();
    } else if (stage === 'sqd') {
        initializeSQD();
    } else if (stage === 'remarks') {
        initializeRemarks();
    } else {
        console.error('Cannot initialize unknown survey section: ' + stage);
    }
}

function showSection(html, stage, direction) {
    if (activeSection !== null) {
        var currentNextButton = sectionChanger.querySelector('#basic-info-next, #cc-next, #sqd-next');
        if (currentNextButton) {
            currentNextButton.disabled = false;
        }

        sectionHistory.push({
            stage: activeSection,
            html: sectionChanger.innerHTML,
            values: captureControlValues()
        });
    }

    var cachedSection = forwardSections.length > 0
        ? forwardSections[forwardSections.length - 1]
        : null;
    if (cachedSection && cachedSection.stage === stage) {
        forwardSections.pop();
        html = cachedSection.html;
    } else {
        forwardSections = [];
    }

    sectionChanger.innerHTML = html;
    activeSection = stage;
    if (cachedSection && cachedSection.stage === stage) {
        restoreControlValues(cachedSection.values);
    }
    initializeSection(stage);
    animateSection(direction);
}

function navigateToPreviousSection() {
    if (activeSection !== null) {
        forwardSections.push({
            stage: activeSection,
            html: sectionChanger.innerHTML,
            values: captureControlValues()
        });
    }

    var previousSection = sectionHistory.pop();
    if (!previousSection) {
        forwardSections.pop();
        return;
    }

    sectionChanger.innerHTML = previousSection.html;
    activeSection = previousSection.stage;
    restoreControlValues(previousSection.values);
    initializeSection(previousSection.stage);
    animateSection('back');
}

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

        ccLoadPending = false;
        showSection(request.responseText, 'cc', 'forward');
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

function loadSQDSection(onError) {
    if (sqdLoadPending) {
        return;
    }

    sqdLoadPending = true;
    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
        if (request.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (request.status !== 200) {
            sqdLoadPending = false;
            showLoadError('Unable to load sqd.html. HTTP status: ' + request.status);
            if (onError) {
                onError();
            }
            return;
        }

        sqdLoadPending = false;
        showSection(request.responseText, 'sqd', 'forward');
    };
    request.onerror = function () {
        sqdLoadPending = false;
        showLoadError('A network error occurred while loading sqd.html.');
        if (onError) {
            onError();
        }
    };

    request.open('GET', 'content/sqd.html', true);
    request.send();
}

function loadRemarksSection(onError) {
    if (remarksLoadPending) {
        return;
    }

    remarksLoadPending = true;
    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
        if (request.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (request.status !== 200) {
            remarksLoadPending = false;
            showLoadError('Unable to load remarks.html. HTTP status: ' + request.status);
            if (onError) {
                onError();
            }
            return;
        }

        remarksLoadPending = false;
        showSection(request.responseText, 'remarks', 'forward');
    };
    request.onerror = function () {
        remarksLoadPending = false;
        showLoadError('A network error occurred while loading remarks.html.');
        if (onError) {
            onError();
        }
    };

    request.open('GET', 'content/remarks.html', true);
    request.send();
}

function initializeBasicInfo() {
    var carouselElement = document.getElementById('basic-info-carousel');
    var form = document.getElementById('basic-info-form');
    var previousButton = document.getElementById('basic-info-previous');
    var nextButton = document.getElementById('basic-info-next');
    var progress = document.getElementById('basic-info-progress');
    var stepLabel = document.getElementById('basic-info-step-label');
    var agencySelect = document.getElementById('agency');
    var serviceSelect = document.getElementById('service');
    var serviceOtherInput = document.getElementById('service-other');
    var serviceOtherModalElement = document.getElementById('service-other-modal');
    var serviceOtherSaveButton = document.getElementById('service-other-save');

    if (!carouselElement || !form || !previousButton || !nextButton || !progress || !stepLabel ||
        !agencySelect || !serviceSelect || !serviceOtherInput || !serviceOtherModalElement || !serviceOtherSaveButton) {
        console.error('The basic information form is missing required survey controls.');
        return;
    }

    var steps = Array.prototype.slice.call(carouselElement.querySelectorAll('.carousel-item'));
    if (steps.length === 0) {
        console.error('The basic information carousel has no steps.');
        return;
    }
    var currentIndex = steps.findIndex(function (step) {
        return step.classList.contains('active');
    });
    if (currentIndex < 0) {
        currentIndex = 0;
    }
    var nextButtonMarkup = nextButton.innerHTML;
    var carousel = new bootstrap.Carousel(carouselElement, {
        interval: false,
        keyboard: false,
        touch: false,
        wrap: false
    });
    var serviceOtherModal = new bootstrap.Modal(serviceOtherModalElement);
    var serviceCatalogs = {
        executive: [
            'Request information or assistance from the office',
            'Submit documents for review or endorsement',
            'Request coordination or approval'
        ],
        academic: [
            'Request academic information or assistance',
            'Submit academic documents for review',
            'Request instructional or program support'
        ],
        studentRecords: [
            'Request for Transcript of Records',
            'Request for Certificate of Good Moral Character',
            'Request for Certificate of Enrollment'
        ],
        studentAffairs: [
            'Request student support or counseling',
            'Request student organization assistance',
            'Request information about student programs or activities'
        ],
        library: [
            'Borrow or renew library materials',
            'Request library research assistance',
            'Request library access or account assistance'
        ],
        quality: [
            'Request quality assurance or accreditation information',
            'Submit documents for quality review',
            'Request quality management assistance'
        ],
        publication: [
            'Request publication or editorial assistance',
            'Request instructional material development support',
            'Submit creative or instructional work for review'
        ],
        administration: [
            'Request administrative or operational assistance',
            'Submit documents for office processing',
            'Request information about university procedures'
        ],
        humanResource: [
            'Request personnel or employment records',
            'Request human resource or leave assistance',
            'Request information about recruitment or employee benefits'
        ],
        budget: [
            'Request budget allocation or availability information',
            'Submit budget documents for review',
            'Request budget processing assistance'
        ],
        accounting: [
            'Request accounting or financial document processing',
            'Submit documents for accounting review',
            'Request information about payment or liquidation requirements'
        ],
        cashier: [
            'Pay university fees or charges',
            'Request an official receipt or payment record',
            'Request assistance with refunds or payment concerns'
        ],
        records: [
            'Request a copy of an office record or document',
            'Submit documents for receiving or records processing',
            'Request records verification or certification'
        ],
        facilities: [
            'Request repair or maintenance of university facilities',
            'Request facility or equipment assistance',
            'Request housekeeping or utility support'
        ],
        property: [
            'Request supplies or property items',
            'Submit property accountability or inventory documents',
            'Request property or equipment assistance'
        ],
        procurement: [
            'Submit a procurement request',
            'Request procurement or bidding information',
            'Request supplier or procurement process assistance'
        ],
        bidsAwards: [
            'Request bidding or procurement documents',
            'Submit bidding requirements',
            'Request information about a procurement activity'
        ],
        research: [
            'Request research program or project assistance',
            'Submit a research proposal or report',
            'Request research funding or coordination information'
        ],
        extension: [
            'Request extension or community program assistance',
            'Request community training or technical support',
            'Propose or coordinate an extension activity'
        ],
        intellectualProperty: [
            'Request intellectual property or technology transfer assistance',
            'Submit an invention or creative work for evaluation',
            'Request information about intellectual property protection'
        ],
        researchCenter: [
            'Request research or laboratory assistance',
            'Request technical information or testing support',
            'Propose or coordinate a research activity'
        ],
        externalAffairs: [
            'Request partnership or institutional linkages assistance',
            'Coordinate an international or national activity',
            'Request information about external affairs programs'
        ],
        alumni: [
            'Request alumni records or verification',
            'Coordinate an alumni or community activity',
            'Request alumni or community affairs assistance'
        ],
        digitalization: [
            'Request digital service or online system assistance',
            'Request help with a digitalization project',
            'Report an issue with a university digital service'
        ],
        it: [
            'Request computer, network, or account support',
            'Request information system access or assistance',
            'Report an information technology issue'
        ],
        planning: [
            'Request university planning or development information',
            'Submit planning or monitoring documents',
            'Request institutional data or planning assistance'
        ],
        information: [
            'Request university information or materials',
            'Request assistance with a public information matter',
            'Submit information or materials for publication'
        ],
        genderDevelopment: [
            'Request gender and development program assistance',
            'Request information about GAD activities or training',
            'Request referral or support related to gender concerns'
        ],
        disasterRisk: [
            'Request disaster preparedness or safety information',
            'Request risk reduction or emergency coordination',
            'Request disaster preparedness training or assistance'
        ],
        climate: [
            'Request climate change or environmental information',
            'Coordinate an environmental or climate activity',
            'Request climate change program assistance'
        ],
        nstp: [
            'Request NSTP enrollment or program information',
            'Request community immersion or deployment assistance',
            'Submit NSTP documents or requirements'
        ],
        sports: [
            'Request sports facility or equipment assistance',
            'Register or request information about sports activities',
            'Coordinate a sports event or program'
        ],
        culture: [
            'Request cultural program or event assistance',
            'Participate in or coordinate a cultural activity',
            'Request information about university cultural services'
        ],
        grievance: [
            'File or follow up a grievance or complaint',
            'Request assistance with complaint procedures',
            'Request information about grievance resolution'
        ],
        business: [
            'Request university business or commercial service information',
            'Submit a business or concession proposal',
            'Request assistance with a university business transaction'
        ],
        project: [
            'Request project coordination or implementation assistance',
            'Submit project documents for review',
            'Request information about a university project'
        ],
        ecotourism: [
            'Request eco-tourism or landholding information',
            'Request access or assistance for a university site',
            'Coordinate an eco-tourism or land management activity'
        ],
        dataProtection: [
            'Request privacy or personal data assistance',
            'Submit a data privacy concern or request',
            'Request information about personal data handling'
        ],
        qualityManagement: [
            'Request quality management system assistance',
            'Submit documents for quality management review',
            'Request information about quality procedures'
        ],
        campus: [
            'Request for Transcript of Records',
            'Request for Certificate of Good Moral Character',
            'Request for Certificate of Enrollment',
            'Request admission or registration assistance'
        ],
        otherOffice: [
            'Request information or assistance from the office',
            'Submit documents for office processing',
            'Request a record or document from the office'
        ]
    };
    var officeServiceCatalogs = {
        'office-of-the-president': 'executive',
        'board-secretary': 'executive',
        'internal-audit': 'administration',
        'legal-office': 'administration',
        'vp-academic-affairs': 'academic',
        instruction: 'academic',
        'student-affairs': 'studentAffairs',
        'library-services': 'library',
        'quality-assurance': 'quality',
        publication: 'publication',
        'vp-administration-finance': 'administration',
        'human-resource': 'humanResource',
        budget: 'budget',
        accounting: 'accounting',
        cashier: 'cashier',
        records: 'records',
        'general-services': 'facilities',
        'supply-property': 'property',
        procurement: 'procurement',
        'bids-awards': 'bidsAwards',
        'vp-research-extension': 'research',
        'research-office': 'research',
        'extension-office': 'extension',
        'ip-management': 'intellectualProperty',
        'food-industrial-technology': 'researchCenter',
        'fisheries-aquamarine': 'researchCenter',
        'crop-science': 'researchCenter',
        'social-science': 'researchCenter',
        livestock: 'researchCenter',
        'vp-external-affairs': 'externalAffairs',
        'international-national-affairs': 'externalAffairs',
        'alumni-community': 'alumni',
        digitalization: 'digitalization',
        mis: 'it',
        planning: 'planning',
        'information-unit': 'information',
        'gender-development': 'genderDevelopment',
        'disaster-risk-reduction': 'disasterRisk',
        'climate-change': 'climate',
        nstp: 'nstp',
        'sports-services': 'sports',
        'cultural-services': 'culture',
        'grievance-complaint': 'grievance',
        'university-business': 'business',
        'project-management': 'project',
        'eco-tourism': 'ecotourism',
        'data-protection': 'dataProtection',
        'quality-management': 'qualityManagement',
        'main-campus': 'campus',
        'pontevedra-campus': 'campus',
        'burias-campus': 'campus',
        'dayao-campus': 'campus',
        'pilar-campus': 'campus',
        'mambusao-campus': 'campus',
        'dumarao-campus': 'campus',
        'sigma-campus': 'campus',
        'tapaz-campus': 'campus',
        'sapian-campus': 'campus',
        other: 'otherOffice'
    };

    function renderServiceOptions(resetSelection) {
        var selectedService = resetSelection ? '' : serviceSelect.value;
        if (!agencySelect.value) {
            serviceSelect.innerHTML = '<option value="" selected disabled>Select a department or office first</option>';
            serviceSelect.disabled = true;
            return;
        }

        var catalogName = officeServiceCatalogs[agencySelect.value];
        var services = serviceCatalogs[catalogName];
        if (!services) {
            console.error('No service catalog is configured for office: ' + agencySelect.value);
            services = serviceCatalogs.otherOffice;
        }

        serviceSelect.innerHTML = '<option value="" selected disabled>Select a service</option>';
        serviceSelect.disabled = false;
        services.forEach(function (service) {
            var option = document.createElement('option');
            option.value = service;
            option.textContent = service;
            serviceSelect.appendChild(option);
        });

        var otherOption = document.createElement('option');
        otherOption.value = 'other';
        otherOption.textContent = 'Others (please specify)';
        serviceSelect.appendChild(otherOption);

        if (selectedService && Array.prototype.some.call(serviceSelect.options, function (option) {
            return option.value === selectedService;
        })) {
            serviceSelect.value = selectedService;
        }
    }

    renderServiceOptions(false);

    agencySelect.addEventListener('change', function () {
        renderServiceOptions(true);
        serviceOtherInput.value = '';
        serviceOtherInput.required = false;
        serviceOtherInput.setCustomValidity('');
    });

    function showServiceOtherModal() {
        serviceOtherInput.required = true;
        serviceOtherModal.show();
    }

    serviceSelect.addEventListener('change', function () {
        if (serviceSelect.value === 'other') {
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

        if (field === serviceSelect && serviceSelect.value === 'other' && !serviceOtherInput.value.trim()) {
            showServiceOtherModal();
            return;
        }

        if (currentIndex === steps.length - 1) {
            nextButton.disabled = true;
            loadCCSection(function () {
                nextButton.disabled = false;
            });
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

    var currentIndex = steps.findIndex(function (step) {
        return step.classList.contains('active');
    });
    if (currentIndex < 0) {
        currentIndex = 0;
    }
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
        nextButton.disabled = true;
        loadSQDSection(function () {
            nextButton.disabled = false;
        });
    }

    function updateControls() {
        progress.textContent = (currentIndex + 1) + ' of ' + steps.length;
        stepLabel.textContent = 'Question ' + (currentIndex + 1) + ' of ' + steps.length;
        previousButton.disabled = false;
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
        previousButton.disabled = false;
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
            navigateToPreviousSection();
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

function initializeSQD() {
    var carouselElement = document.getElementById('sqd-carousel');
    var previousButton = document.getElementById('sqd-previous');
    var nextButton = document.getElementById('sqd-next');
    var progress = document.getElementById('sqd-progress');
    var stepLabel = document.getElementById('sqd-step-label');

    if (!carouselElement || !previousButton || !nextButton || !progress || !stepLabel) {
        console.error('The service quality survey is missing required controls.');
        return;
    }

    var steps = Array.prototype.slice.call(carouselElement.querySelectorAll('.carousel-item'));
    if (steps.length !== 8) {
        console.error('The service quality survey must contain exactly eight questions.');
        return;
    }

    var currentIndex = steps.findIndex(function (step) {
        return step.classList.contains('active');
    });
    if (currentIndex < 0) {
        currentIndex = 0;
    }
    var nextButtonMarkup = nextButton.innerHTML;
    var carousel = new bootstrap.Carousel(carouselElement, {
        interval: false,
        keyboard: false,
        touch: false,
        wrap: false
    });

    function updateControls() {
        progress.textContent = (currentIndex + 1) + ' of ' + steps.length;
        stepLabel.textContent = 'Question ' + (currentIndex + 1) + ' of ' + steps.length;
        previousButton.disabled = false;
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
        previousButton.disabled = false;
        nextButton.disabled = false;
        updateControls();
    });

    nextButton.addEventListener('click', function () {
        var firstChoice = steps[currentIndex].querySelector('input[type="radio"]');
        if (!firstChoice) {
            console.error('The current service quality question has no answer choices.');
            return;
        }

        if (!firstChoice.checkValidity()) {
            firstChoice.reportValidity();
            return;
        }

        if (currentIndex === steps.length - 1) {
            nextButton.disabled = true;
            loadRemarksSection(function () {
                nextButton.disabled = false;
            });
            return;
        }

        carousel.next();
    });

    previousButton.addEventListener('click', function () {
        if (currentIndex === 0) {
            navigateToPreviousSection();
            return;
        }

        carousel.prev();
    });

    updateControls();
}

function initializeRemarks() {
    var carouselElement = document.getElementById('remarks-carousel');
    var form = document.getElementById('remarks-form');
    var backButton = document.getElementById('remarks-back');

    if (!carouselElement || !form || !backButton) {
        console.error('The remarks section is missing its form or thank-you screen.');
        return;
    }

    var slides = carouselElement.querySelectorAll('.carousel-item');
    if (slides.length !== 2) {
        console.error('The remarks carousel must contain a form and a thank-you screen.');
        return;
    }

    var carousel = new bootstrap.Carousel(carouselElement, {
        interval: false,
        keyboard: false,
        touch: false,
        wrap: false
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        carousel.next();
    });

    var backToSQDButton = document.getElementById('remarks-back-to-sqd');
    if (!backToSQDButton) {
        console.error('The remarks form is missing its back-to-SQD button.');
        return;
    }

    backToSQDButton.addEventListener('click', navigateToPreviousSection);

    backButton.addEventListener('click', function () {
        carousel.prev();
    });
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
            activeSection = 'basicinfo';
            initializeBasicInfo();
        };
        request.onerror = function () {
            handleLoadFailure('A network error occurred while loading basicinfo.html.');
        };

        request.open('GET', 'content/basicinfo.html', true);
        request.send();
    });
}
