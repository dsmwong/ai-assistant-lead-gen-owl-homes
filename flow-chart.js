flowchart TD
    %% External Triggers
    FormSubmit[Form Submission] -->|Triggers| FormSubmittedFn[form-submitted.js]
    InboundEmail[Inbound Email] -->|Triggers| LogInboundEmailFn[log-inbound-email.js]

    %% Provider Factory and Core Providers
    ProviderFactory{Provider Factory}
    ProviderFactory -->|Creates| DB[(Airtable Provider)]
    ProviderFactory -->|Creates| Email[(SendGrid Provider)]

    %% Form Submission Flow
    FormSubmittedFn -->|Uses| ValidationUtils[Validation Utils]
    FormSubmittedFn -->|Uses| ResponseUtils[Response Utils]
    FormSubmittedFn -->|Initializes| ProviderFactory
    FormSubmittedFn -->|Creates Lead| DB
    FormSubmittedFn -->|Sends to| SendToAssistant[send-to-assistant.js]

    %% Inbound Email Flow
    LogInboundEmailFn -->|Uses| EmailUtils[Email Utils]
    LogInboundEmailFn -->|Uses| ResponseUtils
    LogInboundEmailFn -->|Initializes| ProviderFactory
    LogInboundEmailFn -->|Logs Email| DB
    LogInboundEmailFn -->|Sends to| SendToAssistant

    %% Assistant Integration
    SendToAssistant -->|Creates/Updates| LogSessions[log-sessions.js]
    LogSessions -->|Uses| DB
    LogSessions -->|Triggers| AIAssistant{AI Assistant}

    %% Email Response Flow
    AIAssistant -->|Generates Response| LogOutboundEmail[log-outbound-email.js]
    LogOutboundEmail -->|Uses| DB
    LogOutboundEmail -->|Sends via| Email

    %% Optional Flows
    LogOutboundEmail -->|Can Transfer to| SendToFlex[send-to-flex.js]
    LogOutboundEmail -->|Can Transfer to| StudioHandover[studio-handover.js]

    %% Utility Assets
    subgraph Utils
        ValidationUtils
        ResponseUtils
        EmailUtils
    end

    %% Style Definitions
    classDef function fill:#f9f,stroke:#333,stroke-width:2px
    classDef provider fill:#bbf,stroke:#333,stroke-width:2px
    classDef trigger fill:#dfd,stroke:#333,stroke-width:2px
    classDef utils fill:#ffd,stroke:#333,stroke-width:2px

    %% Apply Styles
    class FormSubmittedFn,LogInboundEmailFn,SendToAssistant,LogSessions,LogOutboundEmail,SendToFlex,StudioHandover function
    class ProviderFactory,DB,Email provider
    class FormSubmit,InboundEmail trigger
    class ValidationUtils,ResponseUtils,EmailUtils utils