# Security Incident Response Procedures

## Overview

This document outlines the procedures for responding to security incidents in the Pet Card Generator application, specifically related to content sanitization, XSS attacks, and security violations. These procedures ensure rapid response, proper containment, and effective resolution of security threats.

## Table of Contents

1. [Incident Classification](#incident-classification)
2. [Response Team Structure](#response-team-structure)
3. [Detection and Alerting](#detection-and-alerting)
4. [Response Procedures](#response-procedures)
5. [Escalation Matrix](#escalation-matrix)
6. [Communication Protocols](#communication-protocols)
7. [Post-Incident Activities](#post-incident-activities)
8. [Playbooks](#playbooks)

## Incident Classification

### Severity Levels

#### 🔴 Critical (P0)
**Response Time: Immediate (< 15 minutes)**

- Active XSS attacks bypassing sanitization
- Mass security violations indicating coordinated attack
- Complete sanitization system failure
- Data breach involving user content
- Malicious content successfully stored and served to users

**Examples:**
- Script injection successfully executing in user browsers
- Sanitization service completely down
- Coordinated attack with >100 violations/hour
- User data exfiltration detected

#### 🟠 High (P1)
**Response Time: 1 hour**

- New XSS attack vectors discovered
- Sanitization performance severely degraded (>5x normal)
- Multiple users reporting security warnings
- Suspicious patterns in security logs
- Rate limiting system compromised

**Examples:**
- New attack vector bypassing current policies
- Sanitization taking >2 seconds per request
- >50 security violations from single user
- Unusual geographic patterns in attacks

#### 🟡 Medium (P2)
**Response Time: 4 hours**

- Individual security violations with high severity
- Performance degradation affecting user experience
- Configuration errors in security policies
- False positive rates exceeding thresholds
- Monitoring system alerts

**Examples:**
- Single user with critical violations
- Sanitization taking >500ms consistently
- Security policy misconfiguration
- >10% false positive rate in violation detection

#### 🟢 Low (P3)
**Response Time: 24 hours**

- Minor security violations
- Performance monitoring alerts
- User reports of content formatting issues
- Routine security policy updates needed
- Documentation or training gaps identified

**Examples:**
- Individual low-severity violations
- User confusion about content formatting
- Minor performance degradation
- Security awareness training needed

### Incident Types

#### Content Security Incidents
- XSS attack attempts
- Malicious content injection
- Sanitization bypass attempts
- Content manipulation attacks

#### System Security Incidents
- Authentication/authorization failures
- Rate limiting bypass attempts
- API abuse and DoS attacks
- Configuration tampering

#### Performance Security Incidents
- Resource exhaustion attacks
- Sanitization performance degradation
- System overload from security processing
- Cache poisoning attempts

#### Data Security Incidents
- Unauthorized data access
- Data integrity violations
- Privacy policy violations
- User data exposure

## Response Team Structure

### Core Security Team

#### Security Lead
**Primary Responsibilities:**
- Overall incident coordination
- Decision making on containment actions
- External communication authorization
- Post-incident review leadership

**Contact Information:**
- Primary: [Security Lead Email]
- Secondary: [Security Lead Phone]
- Escalation: [CISO/CTO]

#### Technical Lead
**Primary Responsibilities:**
- Technical analysis and investigation
- System changes and fixes implementation
- Performance impact assessment
- Recovery coordination

**Contact Information:**
- Primary: [Tech Lead Email]
- Secondary: [Tech Lead Phone]
- Escalation: [Engineering Manager]

#### DevOps Lead
**Primary Responsibilities:**
- Infrastructure monitoring and response
- Deployment and rollback coordination
- System health monitoring
- Capacity management during incidents

**Contact Information:**
- Primary: [DevOps Lead Email]
- Secondary: [DevOps Lead Phone]
- Escalation: [Infrastructure Manager]

### Extended Response Team

#### Product Manager
- User impact assessment
- Feature rollback decisions
- User communication coordination
- Business impact evaluation

#### Legal/Compliance
- Regulatory notification requirements
- Legal implications assessment
- Privacy impact evaluation
- External reporting obligations

#### Customer Support
- User communication
- Support ticket management
- User impact documentation
- Feedback collection

## Detection and Alerting

### Automated Detection Systems

#### Sentry Alerts
**Critical Alerts (Immediate notification):**
- Security violation rate >10/minute
- Sanitization failure rate >5%
- New attack vector detected
- System performance degradation >200%

**High Priority Alerts (15-minute notification):**
- Security violation rate >5/minute
- Individual user with >10 violations/hour
- Sanitization latency >1 second
- Rate limiting triggered for >5 users

**Medium Priority Alerts (1-hour notification):**
- Security violation rate >2/minute
- Performance degradation >50%
- Configuration validation failures
- Unusual geographic patterns

#### Monitoring Dashboards
**Real-time Monitoring:**
- Security violation trends
- Sanitization performance metrics
- User behavior patterns
- System health indicators

**Threshold-based Alerts:**
- Violation count thresholds
- Performance degradation thresholds
- Error rate thresholds
- Resource utilization thresholds

### Manual Detection

#### User Reports
- Security warning messages
- Content formatting issues
- Suspicious behavior reports
- Performance complaints

#### Security Audits
- Regular security testing results
- Penetration testing findings
- Code review discoveries
- Configuration audits

## Response Procedures

### Initial Response (First 15 minutes)

#### 1. Incident Confirmation
```bash
# Check system status
curl -f https://api.petcardgenerator.com/health/security
curl -f https://api.petcardgenerator.com/health/sanitization

# Review recent alerts
sentry-cli issues list --query "is:unresolved level:error"

# Check violation patterns
firebase firestore:query security_events --where severity==critical --limit 50
```

#### 2. Initial Assessment
- **Severity determination** using classification matrix
- **Impact scope** assessment (users affected, systems involved)
- **Attack vector** identification
- **Containment urgency** evaluation

#### 3. Team Notification
```bash
# Critical incident notification
slack-notify "#security-incidents" "🚨 CRITICAL: Security incident detected - [Brief Description]"
pagerduty-trigger "security-critical" --message "[Incident Summary]"

# High priority notification  
slack-notify "#security-team" "⚠️ HIGH: Security incident - [Brief Description]"
email-notify security-team@company.com "Security Incident: [Summary]"
```

### Containment Actions

#### Immediate Containment (Critical/High incidents)

**1. Traffic Control**
```bash
# Enable rate limiting
firebase functions:config:set rate_limiting.emergency_mode=true
firebase deploy --only functions

# Block suspicious IPs
cloudflare-firewall add-rule --action block --ip-list suspicious_ips.txt

# Enable enhanced monitoring
sentry-cli releases set-commits --auto --commit HEAD
```

**2. System Protection**
```bash
# Activate strict sanitization mode
firebase functions:config:set sanitization.strict_mode=true
firebase functions:config:set sanitization.block_threshold=0.1

# Disable risky features temporarily
firebase functions:config:set features.user_html=false
firebase functions:config:set features.rich_formatting=false

# Deploy emergency configuration
firebase deploy --only functions:sanitize,functions:validate
```

**3. Data Protection**
```bash
# Enable audit logging
firebase functions:config:set logging.audit_mode=true
firebase functions:config:set logging.detailed_violations=true

# Backup current state
firebase firestore:export gs://security-backups/incident-$(date +%Y%m%d-%H%M%S)

# Monitor data integrity
npm run security:validate-data-integrity
```

#### Extended Containment (All incidents)

**1. User Communication**
```typescript
// Activate security notice
const securityNotice = {
  type: 'security_maintenance',
  message: 'We are currently addressing a security issue. Some features may be temporarily limited.',
  severity: 'info',
  showUntil: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
};

await updateSystemNotice(securityNotice);
```

**2. Enhanced Monitoring**
```bash
# Increase monitoring frequency
sentry-cli monitors update --interval 1m security-violations
sentry-cli monitors update --interval 30s sanitization-performance

# Enable detailed logging
firebase functions:config:set logging.level=debug
firebase functions:config:set logging.include_content=true
```

### Investigation Procedures

#### 1. Evidence Collection
```bash
# Collect security logs
firebase firestore:query security_events \
  --where timestamp ">=" $(date -d "1 hour ago" -u +%Y-%m-%dT%H:%M:%SZ) \
  --order-by timestamp desc \
  --limit 1000 > incident_logs.json

# Collect performance data
sentry-cli events list --query "timestamp:>$(date -d "1 hour ago" +%s)" \
  --format json > sentry_events.json

# Collect system metrics
curl -H "Authorization: Bearer $MONITORING_TOKEN" \
  "https://api.monitoring.com/metrics?start=$(date -d "1 hour ago" +%s)" \
  > system_metrics.json
```

#### 2. Attack Vector Analysis
```typescript
// Analyze violation patterns
const analysisScript = `
  const violations = require('./incident_logs.json');
  
  // Group by attack type
  const byType = violations.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1;
    return acc;
  }, {});
  
  // Group by user
  const byUser = violations.reduce((acc, v) => {
    acc[v.userId] = (acc[v.userId] || 0) + 1;
    return acc;
  }, {});
  
  // Group by IP
  const byIP = violations.reduce((acc, v) => {
    acc[v.ipAddress] = (acc[v.ipAddress] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Attack Types:', byType);
  console.log('Top Users:', Object.entries(byUser).sort((a,b) => b[1] - a[1]).slice(0, 10));
  console.log('Top IPs:', Object.entries(byIP).sort((a,b) => b[1] - a[1]).slice(0, 10));
`;

node -e "${analysisScript}"
```

#### 3. Impact Assessment
```bash
# Count affected users
firebase firestore:query users \
  --where lastSecurityViolation ">=" $(date -d "1 hour ago" -u +%Y-%m-%dT%H:%M:%SZ) \
  --count

# Check data integrity
npm run security:check-data-integrity --since "1 hour ago"

# Assess performance impact
curl -s "https://api.monitoring.com/performance/sanitization?period=1h" | \
  jq '.metrics | {avg_latency, error_rate, throughput}'
```

### Resolution Actions

#### 1. Security Policy Updates
```typescript
// Update security policies
const emergencyPolicy = {
  version: `emergency-${Date.now()}`,
  lastUpdated: new Date().toISOString(),
  policies: {
    user_profile: {
      allowedTags: ['b', 'i', 'em', 'strong'], // Reduced set
      allowedAttributes: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style', 'iframe']
    },
    pet_card_metadata: {
      allowedTags: ['b', 'i'], // Minimal set
      allowedAttributes: {},
      stripIgnoreTag: true
    },
    social_sharing: {
      allowedTags: [], // Plain text only
      allowedAttributes: {}
    }
  },
  riskThresholds: {
    low: 0.05,    // More strict
    medium: 0.15,
    high: 0.4,
    critical: 0.7
  }
};

await securityPolicyManager.updatePolicy(emergencyPolicy);
```

#### 2. Code Fixes
```bash
# Deploy security patches
git checkout -b security-patch-$(date +%Y%m%d-%H%M%S)

# Apply fixes
git cherry-pick security-fix-commits...

# Test security fixes
npm run test:security
npm run test:integration

# Deploy with monitoring
firebase deploy --only functions
npm run monitor:deployment
```

#### 3. System Recovery
```bash
# Gradually restore functionality
firebase functions:config:set sanitization.strict_mode=false
firebase functions:config:set features.user_html=true

# Monitor recovery
watch -n 30 'curl -s https://api.petcardgenerator.com/health | jq .security'

# Validate system health
npm run health:full-check
```

## Escalation Matrix

### Internal Escalation

#### Level 1: Security Team (0-15 minutes)
- Security Lead
- Technical Lead
- DevOps Lead

#### Level 2: Management (15-60 minutes)
- Engineering Manager
- Product Manager
- CTO/CISO

#### Level 3: Executive (1-4 hours)
- CEO
- Legal Counsel
- Board notification (if required)

### External Escalation

#### Regulatory Notifications
**GDPR (EU users affected):**
- Timeline: 72 hours for data protection authority
- Timeline: Without undue delay for affected users
- Trigger: Personal data breach

**Other Jurisdictions:**
- Follow local data breach notification laws
- Consult legal team for requirements
- Document all notifications

#### Customer Communications
**Immediate (Critical incidents):**
- System status page update
- In-app security notice
- Support team briefing

**24-hour (High/Critical incidents):**
- Email to affected users
- Blog post or public statement
- Social media acknowledgment

**Post-resolution (All incidents):**
- Detailed incident report
- Security improvements summary
- Prevention measures implemented

## Communication Protocols

### Internal Communications

#### Incident Channel: #security-incidents
**Purpose:** Real-time incident coordination
**Participants:** Core security team, management
**Updates:** Every 30 minutes during active incidents

**Message Format:**
```
🚨 [SEVERITY] Security Incident Update #[NUMBER]
Time: [HH:MM UTC]
Status: [Investigating/Containing/Resolving/Resolved]
Impact: [Brief description]
Actions: [Current actions being taken]
ETA: [Estimated resolution time]
Next Update: [Time of next update]
```

#### Management Updates
**Frequency:** Every hour for Critical/High, every 4 hours for Medium
**Format:** Executive summary with key metrics
**Distribution:** Engineering Manager, Product Manager, CTO

#### All-Hands Updates
**Trigger:** Incidents affecting >10% of users or lasting >4 hours
**Format:** Company-wide email or Slack announcement
**Approval:** CTO or CEO required

### External Communications

#### Status Page Updates
**Trigger:** Any incident affecting user experience
**Timeline:** Within 30 minutes of incident confirmation
**Content:** Brief, factual description without technical details

**Template:**
```
We are currently investigating reports of [brief description]. 
We are working to resolve this issue as quickly as possible and 
will provide updates as more information becomes available.
```

#### User Notifications
**In-App Notices:**
- Immediate for Critical incidents
- 1 hour for High incidents
- 4 hours for Medium incidents affecting UX

**Email Notifications:**
- 24 hours for incidents requiring user action
- Post-resolution for all Critical/High incidents
- Include clear action items for users

#### Public Communications
**Blog Posts:**
- Required for Critical incidents
- Optional for High incidents with broad impact
- Include timeline, impact, resolution, prevention

**Social Media:**
- Acknowledge incident awareness
- Direct users to status page
- Provide resolution updates

## Post-Incident Activities

### Immediate Post-Resolution (0-24 hours)

#### 1. System Validation
```bash
# Comprehensive security testing
npm run test:security:full
npm run test:penetration:automated
npm run test:performance:security

# Validate all systems
curl -f https://api.petcardgenerator.com/health/full
firebase functions:log --limit 100 | grep -i error

# Check user experience
npm run test:e2e:security-flows
```

#### 2. Monitoring Enhancement
```bash
# Increase monitoring sensitivity
sentry-cli monitors update --threshold 0.5 security-violations
sentry-cli monitors update --threshold 200ms sanitization-latency

# Add specific monitoring for incident type
sentry-cli monitors create --name "incident-specific-monitor" \
  --query "event.tags.incident_type:${INCIDENT_TYPE}"
```

#### 3. User Communication
```typescript
// Send resolution notification
const resolutionNotice = {
  type: 'security_resolved',
  message: 'The security issue has been resolved. All systems are operating normally.',
  severity: 'success',
  showUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
};

await updateSystemNotice(resolutionNotice);

// Email affected users if applicable
if (affectedUsers.length > 0) {
  await sendResolutionEmail(affectedUsers, incidentSummary);
}
```

### Short-term Follow-up (1-7 days)

#### 1. Incident Analysis
```bash
# Generate comprehensive incident report
npm run incident:analyze --incident-id ${INCIDENT_ID} --output report.md

# Performance impact analysis
npm run performance:analyze --period "incident" --baseline "pre-incident"

# User impact assessment
npm run users:impact-analysis --incident-id ${INCIDENT_ID}
```

#### 2. Security Improvements
- Review and update security policies
- Implement additional monitoring
- Update incident response procedures
- Enhance security testing

#### 3. Team Debrief
- Conduct blameless post-mortem
- Identify process improvements
- Update documentation
- Plan training if needed

### Long-term Follow-up (1-4 weeks)

#### 1. Process Improvements
- Update incident response procedures
- Enhance monitoring and alerting
- Improve security testing coverage
- Strengthen preventive measures

#### 2. Training and Awareness
- Security team training updates
- Developer security awareness
- User education improvements
- Documentation updates

#### 3. Compliance and Reporting
- Regulatory compliance verification
- Internal audit requirements
- Board reporting if required
- Insurance notifications

## Playbooks

### XSS Attack Response Playbook

#### Detection Indicators
- Script tags in sanitized content
- JavaScript execution in user browsers
- Unusual DOM manipulation
- Cross-site request patterns

#### Immediate Actions
1. **Activate strict sanitization mode**
2. **Block affected content/users**
3. **Increase monitoring sensitivity**
4. **Notify security team**

#### Investigation Steps
1. **Identify attack vector**
2. **Assess bypass mechanism**
3. **Check for data exfiltration**
4. **Trace attack source**

#### Resolution Actions
1. **Update sanitization rules**
2. **Deploy security patches**
3. **Validate fix effectiveness**
4. **Monitor for recurrence**

### Performance Degradation Playbook

#### Detection Indicators
- Sanitization latency >500ms
- High CPU usage in sanitization
- User complaints about slowness
- Timeout errors increasing

#### Immediate Actions
1. **Check system resources**
2. **Enable performance monitoring**
3. **Consider load balancing**
4. **Notify technical team**

#### Investigation Steps
1. **Identify bottlenecks**
2. **Analyze content patterns**
3. **Check configuration changes**
4. **Review recent deployments**

#### Resolution Actions
1. **Optimize sanitization logic**
2. **Implement caching**
3. **Scale resources if needed**
4. **Update performance thresholds**

### Mass Violation Event Playbook

#### Detection Indicators
- >50 violations per hour
- Multiple users affected
- Coordinated attack patterns
- Geographic clustering

#### Immediate Actions
1. **Enable rate limiting**
2. **Block suspicious IPs**
3. **Activate enhanced logging**
4. **Alert security team**

#### Investigation Steps
1. **Analyze attack patterns**
2. **Identify coordination**
3. **Check for automation**
4. **Assess impact scope**

#### Resolution Actions
1. **Implement IP blocking**
2. **Update rate limits**
3. **Enhance detection rules**
4. **Monitor for persistence**

## Contact Information

### Emergency Contacts
- **Security Lead:** [Email] / [Phone]
- **Technical Lead:** [Email] / [Phone]
- **DevOps Lead:** [Email] / [Phone]
- **On-call Engineer:** [Pager] / [Phone]

### Escalation Contacts
- **Engineering Manager:** [Email] / [Phone]
- **CTO:** [Email] / [Phone]
- **CEO:** [Email] / [Phone]
- **Legal:** [Email] / [Phone]

### External Contacts
- **Hosting Provider:** [Support Number]
- **CDN Provider:** [Support Number]
- **Security Vendor:** [Support Number]
- **Legal Counsel:** [Phone] / [Email]

## Appendices

### Appendix A: Security Tools and Commands
### Appendix B: Incident Report Templates
### Appendix C: Communication Templates
### Appendix D: Legal and Compliance Requirements
### Appendix E: Vendor Contact Information

---

**Document Version:** 1.0  
**Last Updated:** [Current Date]  
**Next Review:** [Date + 6 months]  
**Owner:** Security Team  
**Approved By:** CTO