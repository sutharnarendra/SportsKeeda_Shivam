package com.yatrax.service;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String senderEmail;

    // Decoupled: Loads out HTML file directly from the resources folder!
    @Value("classpath:templates/email-template.html")
    private Resource emailTemplate;

    // Reads the HTML template file and replaces the double-curly placeholders
    private String buildVerificationHtml(String name, String otp) {
        try {
            String htmlContent = StreamUtils.copyToString(emailTemplate.getInputStream(), StandardCharsets.UTF_8);
            return htmlContent
                    .replace("{{name}}", name)
                    .replace("{{otp}}", otp);
        } catch (IOException e) {
            logger.error("Failed to load email template file! Falling back to plain text: {}", e.getMessage());
            return "Hello " + name + ", your Yatra X verification OTP code is: " + otp;
        }
    }

    public void sendVerificationEmail(String recipientEmail, String name, String otp) {
        String htmlContent = buildVerificationHtml(name, otp);

        // Check if running in simulated developer mode
        if (senderEmail == null || senderEmail.contains("placeholder") || senderEmail.isBlank()) {
            logger.info("===============================================================");
            logger.info(" SIMULATED EMAIL SEND (DEVELOPER MODE)");
            logger.info(" FROM: onboarding@resend.dev (Yatra X Security)");
            logger.info(" TO: {}", recipientEmail);
            logger.info(" SUBJECT: Verify your Yatra X Account");
            logger.info(" SECURITY OTP CODE: [ {} ]", otp);
            logger.info("===============================================================");
            return;
        }

        // Live mode: Send real email using Gmail SMTP
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(senderEmail, "Yatra X Security");
            helper.setTo(recipientEmail);
            helper.setSubject("Verify Your Yatra X Account");
            helper.setText(htmlContent, true); // Enable HTML rendering

            mailSender.send(message);
            logger.info("Real verificatio email successfully sent to {}", recipientEmail);
        } catch (MessagingException | UnsupportedEncodingException e) {
            logger.error("Failed to send real email to {}: {}", recipientEmail, e.getMessage());
            logger.info("FALLBACK OTP LOG (Mail Server Error): [ {} ]", otp);
        }
    }
}
