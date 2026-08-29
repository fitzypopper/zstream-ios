import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var store: ZStreamStore

    @State private var username = ""
    @State private var password = ""
    @State private var deviceName = UIDevice.current.name
    @State private var isBusy = false

    var body: some View {
        ZStack {
            ZStreamTheme.background.ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()

                VStack(spacing: 12) {
                    Image(systemName: "play.rectangle.fill")
                        .font(.system(size: 72))
                        .foregroundColor(ZStreamTheme.accent)
                    Text("ZStream")
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                    Text("Sign in to continue")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer().frame(height: 8)

                VStack(spacing: 16) {
                    StyledTextField(icon: "person.fill", placeholder: "Username", text: $username)
                    StyledTextField(icon: "lock.fill", placeholder: "Password", text: $password, isSecure: true)
                    StyledTextField(icon: "iphone.gen3.radiowaves.left.and.right", placeholder: "Device Name", text: $deviceName)
                }
                .padding(.horizontal, 24)

                if let error = store.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }

                Button {
                    isBusy = true
                    Task {
                        await store.login(username: username, password: password, device: deviceName)
                        isBusy = false
                    }
                } label: {
                    HStack {
                        if isBusy {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Sign In")
                                .font(.headline)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(isBusy || username.isEmpty || password.isEmpty || deviceName.isEmpty)
                .padding(.horizontal, 24)

                Spacer()
                Spacer()
            }
            .padding(.vertical, 24)
        }
    }
}

struct StyledTextField: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    var isSecure = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.secondary)
                .frame(width: 28)

            Group {
                if isSecure {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                }
            }
            .textInputAutocapitalization(.never)
            .font(.body)
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 16)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color(.secondarySystemBackground))
        )
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundColor(.white)
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(configuration.isPressed ? ZStreamTheme.accent.opacity(0.8) : ZStreamTheme.accent)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}